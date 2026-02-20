/**
 * Ekskursija Liepāja — Game Server
 *
 * Provides two Socket.io namespaces:
 *   /game  – regular player connections (lobby, progress, ping)
 *   /admin – authenticated Game Master connections
 *
 * Node ≥ 18 · socket.io ^4
 */

const http    = require('http');
const { Server } = require('socket.io');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT               = process.env.PORT || 8080;
const ADMIN_SECRET       = process.env.ADMIN_SECRET || 'admin1234';
const LOBBY_IDLE_TIMEOUT = 3_600_000; // 1 h
const RECONNECT_GRACE    = 30_000;    // 30 s
const ANTICHEAT_MIN_SECS = 60;        // flag completions faster than this
const MAX_LOG_ENTRIES    = 200;       // ring-buffer size for live log

// ── State ─────────────────────────────────────────────────────────────────────
/** @type {Map<string, object>} */
const lobbies = new Map();

/**
 * @typedef {Object} PlayerRecord
 * @property {string}      socketId
 * @property {string}      name
 * @property {number}      score
 * @property {string|null} currentLocation
 * @property {number}      locationsCompleted
 * @property {number}      joinedAt
 * @property {number}      lastActive
 * @property {number|null} latencyMs
 * @property {boolean}     flagged
 */
/** @type {Map<string, PlayerRecord>} */
const players = new Map();

/** Total location completions across all connected players */
let globalProgress = 0;

/** Live-log ring buffer */
const liveLogs = [];

/** Hot-swap question overrides keyed by `${locationId}:${questionIdx}` */
const questionOverrides = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────
function pushLog(level, msg, extra = {}) {
  const entry = { ts: Date.now(), level, msg, ...extra };
  liveLogs.push(entry);
  if (liveLogs.length > MAX_LOG_ENTRIES) liveLogs.shift();
  adminNS.emit('log:entry', entry);
}

function broadcastPlayerList() {
  const list = Array.from(players.values()).map(p => ({
    socketId:           p.socketId,
    name:               p.name,
    score:              p.score,
    currentLocation:    p.currentLocation,
    locationsCompleted: p.locationsCompleted,
    latencyMs:          p.latencyMs,
    flagged:            p.flagged,
    joinedAt:           p.joinedAt,
  }));
  adminNS.emit('admin:players', list);
}

function broadcastGlobalProgress() {
  const total = players.size * 10; // 10 locations per player
  const pct   = total > 0 ? Math.min(100, Math.round((globalProgress / total) * 100)) : 0;
  gameNS.emit('city:progress',  { completed: globalProgress, total, pct });
  adminNS.emit('city:progress', { completed: globalProgress, total, pct });
}

// ── HTTP server + Socket.io ───────────────────────────────────────────────────
const httpServer = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', players: players.size, lobbies: lobbies.size }));
});

const io = new Server(httpServer, {
  cors:           { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout:    20_000,
  pingInterval:   25_000,
  connectTimeout: 10_000,
  transports:     ['websocket', 'polling'],
});

const gameNS  = io.of('/game');
const adminNS = io.of('/admin');

// ── Admin auth middleware ─────────────────────────────────────────────────────
adminNS.use((socket, next) => {
  const { secret } = socket.handshake.auth;
  if (secret === ADMIN_SECRET) return next();
  next(new Error('Unauthorized'));
});

// ════════════════════════════════════════════════════════════════════════════
// /game namespace
// ════════════════════════════════════════════════════════════════════════════
gameNS.on('connection', (socket) => {

  socket.on('player:join', ({ name }) => {
    if (!name || typeof name !== 'string') return;
    const safeNm = String(name).slice(0, 20).replace(/[<>"']/g, '');
    const rec = {
      socketId: socket.id, name: safeNm, score: 0, currentLocation: null,
      locationsCompleted: 0, joinedAt: Date.now(), lastActive: Date.now(),
      latencyMs: null, flagged: false,
    };
    players.set(socket.id, rec);
    pushLog('info', `Spēlētājs pievienojās: ${safeNm}`, { player: safeNm });
    broadcastPlayerList();
    socket.emit('questions:overrides', Object.fromEntries(questionOverrides));
    broadcastGlobalProgress();
  });

  socket.on('player:location', ({ locationId }) => {
    const p = players.get(socket.id);
    if (!p) return;
    p.currentLocation = locationId;
    p.lastActive = Date.now();
    pushLog('info', `${p.name} ienāca: ${locationId}`, { player: p.name, location: locationId });
    broadcastPlayerList();
  });

  socket.on('player:complete', ({ locationId, score, elapsedSecs }) => {
    const p = players.get(socket.id);
    if (!p) return;
    p.score              = typeof score === 'number' ? score : p.score;
    p.currentLocation    = null;
    p.locationsCompleted = (p.locationsCompleted || 0) + 1;
    p.lastActive         = Date.now();
    globalProgress++;

    if (typeof elapsedSecs === 'number' && elapsedSecs < ANTICHEAT_MIN_SECS) {
      p.flagged = true;
      pushLog('warn',
        `[ANTI-CHEAT] ${p.name} pabeidza "${locationId}" ${elapsedSecs}s (min ${ANTICHEAT_MIN_SECS}s)`,
        { player: p.name, location: locationId, elapsedSecs, flagged: true });
      adminNS.emit('anticheat:flag', { socketId: socket.id, name: p.name, locationId, elapsedSecs });
    } else {
      pushLog('info',
        `${p.name} pabeidza: ${locationId} (${elapsedSecs}s, +${score} pts)`,
        { player: p.name, location: locationId, elapsedSecs, score });
    }

    broadcastPlayerList();
    broadcastGlobalProgress();
  });

  socket.on('ping:req', () => {
    socket.emit('ping:ack', { serverTs: Date.now() });
  });

  socket.on('ping:report', ({ latencyMs }) => {
    const p = players.get(socket.id);
    if (!p) return;
    p.latencyMs  = typeof latencyMs === 'number' ? latencyMs : null;
    p.lastActive = Date.now();
    broadcastPlayerList();
  });

  // ── Lobby events ────────────────────────────────────────────────────────────
  socket.on('lobby:create', () => {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    lobbies.set(code, {
      code, host: socket.id, guest: null,
      hostReady: false, guestReady: false,
      hostDone: false, guestDone: false,
      lastActive: Date.now(), created: Date.now(),
      hostTimeout: null, guestTimeout: null,
    });
    socket.join(`lobby:${code}`);
    socket.emit('lobby:created', { code });
    pushLog('info', `Lobby izveidots: ${code}`, { code });
  });

  socket.on('lobby:join', ({ code }) => {
    const lobby = lobbies.get(code);
    if (!lobby)      return socket.emit('lobby:error', { msg: 'Istaba nav atrasta.' });
    if (lobby.guest) return socket.emit('lobby:error', { msg: 'Istaba jau ir pilna.' });
    lobby.guest = socket.id;
    lobby.lastActive = Date.now();
    socket.join(`lobby:${code}`);
    gameNS.to(`lobby:${code}`).emit('lobby:guest_joined', { code });
    socket.emit('lobby:joined', { code });
    pushLog('info', `Spēlētājs pievienojās lobby: ${code}`, { code });
  });

  socket.on('lobby:ready', ({ code, role }) => {
    const lobby = lobbies.get(code);
    if (!lobby) return socket.emit('lobby:error', { msg: 'Istaba nav atrasta.' });
    if (role === 'host')  lobby.hostReady  = true;
    if (role === 'guest') lobby.guestReady = true;
    lobby.lastActive = Date.now();
    if (lobby.hostReady && lobby.guestReady) {
      gameNS.to(`lobby:${code}`).emit('lobby:start', {});
      pushLog('info', `Lobby ${code} — spēle sākusies`);
    } else {
      gameNS.to(`lobby:${code}`).emit('lobby:player_ready', { role });
    }
  });

  socket.on('lobby:task_done', ({ code, role }) => {
    const lobby = lobbies.get(code);
    if (!lobby) return;
    if (role === 'host')  lobby.hostDone  = true;
    if (role === 'guest') lobby.guestDone = true;
    lobby.lastActive = Date.now();
    if (lobby.hostDone && lobby.guestDone) {
      lobby.hostDone = false;
      lobby.guestDone = false;
      gameNS.to(`lobby:${code}`).emit('lobby:sync_complete', {});
    }
  });

  socket.on('disconnect', (reason) => {
    const p = players.get(socket.id);
    if (p) {
      pushLog('info', `Spēlētājs atvienojās: ${p.name} (${reason})`, { player: p.name });
      players.delete(socket.id);
      broadcastPlayerList();
      broadcastGlobalProgress();
    }

    for (const [code, lobby] of lobbies) {
      const isHost  = lobby.host  === socket.id;
      const isGuest = lobby.guest === socket.id;
      if (!isHost && !isGuest) continue;

      const field  = isHost ? 'host'        : 'guest';
      const tField = isHost ? 'hostTimeout' : 'guestTimeout';
      lobby[field] = null;
      clearTimeout(lobby[tField]);
      lobby[tField] = setTimeout(() => {
        if (!lobby[field]) {
          gameNS.to(`lobby:${code}`).emit('lobby:player_disconnected', {
            msg: 'Otrs spēlētājs atvienojās.',
          });
          if (!lobby.host && !lobby.guest) lobbies.delete(code);
        }
      }, RECONNECT_GRACE);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// /admin namespace
// ════════════════════════════════════════════════════════════════════════════
adminNS.on('connection', (socket) => {
  pushLog('info', 'Admin pievienojās');

  // Snapshot on connect
  socket.emit('admin:players',       Array.from(players.values()));
  socket.emit('log:history',         liveLogs.slice());
  const total = players.size * 10;
  socket.emit('city:progress', {
    completed: globalProgress,
    total,
    pct: total > 0 ? Math.min(100, Math.round((globalProgress / total) * 100)) : 0,
  });
  socket.emit('questions:overrides', Object.fromEntries(questionOverrides));

  socket.on('admin:refresh_player', ({ socketId }) => {
    gameNS.to(socketId).emit('session:refresh');
    pushLog('warn', `Admin pārlādēja sesiju: ${socketId}`);
  });

  socket.on('admin:update_question', ({ locationId, questionIdx, patch }) => {
    if (typeof locationId !== 'string' || typeof questionIdx !== 'number') return;
    const key     = `${locationId}:${questionIdx}`;
    const updated = { ...(questionOverrides.get(key) || {}), ...patch };
    questionOverrides.set(key, updated);
    gameNS.emit('questions:override', { locationId, questionIdx, patch: updated });
    pushLog('info', `Jautājums rediģēts: ${locationId} #${questionIdx}`, { locationId, questionIdx });
  });

  socket.on('admin:reset_question', ({ locationId, questionIdx }) => {
    questionOverrides.delete(`${locationId}:${questionIdx}`);
    gameNS.emit('questions:reset', { locationId, questionIdx });
    pushLog('info', `Jautājums atjaunots: ${locationId} #${questionIdx}`);
  });

  socket.on('admin:reset_progress', () => {
    globalProgress = 0;
    broadcastGlobalProgress();
    pushLog('warn', 'Admin atiestatīja globālo progresu');
  });

  socket.on('admin:clear_flag', ({ socketId }) => {
    const p = players.get(socketId);
    if (p) {
      p.flagged = false;
      broadcastPlayerList();
      pushLog('info', `Anti-cheat karodziņš notīrīts: ${p.name}`);
    }
  });

  socket.on('disconnect', () => pushLog('info', 'Admin atvienojās'));
});

// ── Periodic lobby cleanup ────────────────────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [code, lobby] of lobbies) {
    if (now - lobby.lastActive > LOBBY_IDLE_TIMEOUT) {
      gameNS.to(`lobby:${code}`).emit('lobby:timeout');
      lobbies.delete(code);
    }
  }
}, 60_000);

// ── Start ─────────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`[server] Ekskursija socket server listening on :${PORT}`);
  const isDefault = ADMIN_SECRET === 'admin1234';
  console.log(`[server] Admin secret: ${isDefault ? '⚠ default – set ADMIN_SECRET env var' : '✓ custom'}`);
});

process.on('SIGTERM', () => {
  io.close(() => httpServer.close(() => process.exit(0)));
});
