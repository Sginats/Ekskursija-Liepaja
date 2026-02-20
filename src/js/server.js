/**
 * Ekskursija Liepāja — Game Server
 *
 * Socket.io namespaces:
 *   /game  – players (lobby, presence, coop, loot, flash-quiz, finale)
 *   /admin – authenticated Game Master (player tracking, anti-cheat, hot-swap, logs)
 *
 * Node ≥ 18 · socket.io ^4
 */

const http       = require('http');
const { Server } = require('socket.io');

// ── Config ────────────────────────────────────────────────────────────────────
const PORT               = process.env.PORT        || 8080;
const ADMIN_SECRET       = process.env.ADMIN_SECRET;

if (!ADMIN_SECRET) {
  console.warn('[server] ⚠  ADMIN_SECRET env var is not set. Admin namespace is DISABLED until it is provided.');
}
const LOBBY_IDLE_TIMEOUT = 3_600_000;  // 1 h
const RECONNECT_GRACE    = 30_000;     // 30 s
const ANTICHEAT_MIN_SECS = 20;         // flag completions faster than this
const MAX_LOG_ENTRIES    = 200;
const FLASH_QUIZ_MIN_PLAYERS = 3;
const FLASH_QUIZ_TIME_LIMIT  = 20_000; // ms
const COOP_MULTIPLIER        = 1.2;
const COOP_PENALTY           = 3;      // pts deducted from each player on coop fail

// ── State ─────────────────────────────────────────────────────────────────────

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
 * @property {string|null} coopSessionId
 */
const players = new Map();

/** Lobbies (4-digit multiplayer rooms) */
const lobbies = new Map();

/**
 * Shared loot pool: Set of itemIds currently available for use.
 * @type {Map<string, { itemId: string, foundBy: string, foundAt: string }>}
 */
const lootPool = new Map();

/**
 * Active cooperative dual-key sessions.
 * @type {Map<string, { locationId: string, questionerId: string, clueHolderId: string, status: string }>}
 */
const coopSessions = new Map();

/**
 * Active flash quiz state (null when inactive).
 * @type {{ quizId: string, question: object, startedAt: number, timer: NodeJS.Timeout, responses: Map<string, string> } | null}
 */
let flashQuiz = null;
let flashQuizLastIdx = -1;

/**
 * Finale lobby: players who have completed all 10 locations.
 * @type {Map<string, { name: string, score: number, timeSeconds: number, completedAt: number }>}
 */
const finalePlayers = new Map();

/** Global city progress (total location completions across all players) */
let globalProgress = 0;

/** Ring-buffer live log */
const liveLogs = [];

/** Hot-swap question overrides: key = `${locationId}:${questionIdx}` */
const questionOverrides = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────
function pushLog(level, msg, extra = {}) {
  const entry = { ts: Date.now(), level, msg, ...extra };
  liveLogs.push(entry);
  if (liveLogs.length > MAX_LOG_ENTRIES) liveLogs.shift();
  adminNS.emit('log:entry', entry);
}

function safeName(raw) {
  return String(raw || '').slice(0, 20).replace(/[<>"']/g, '');
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

function broadcastMapPresence() {
  const list = Array.from(players.values()).map(p => ({
    socketId:        p.socketId,
    name:            p.name,
    currentLocation: p.currentLocation,
  }));
  gameNS.emit('map:presence', list);
}

function broadcastGlobalProgress() {
  const total = Math.max(players.size * 10, 1);
  const pct   = Math.min(100, Math.round((globalProgress / total) * 100));
  const payload = { completed: globalProgress, total, pct };
  gameNS.emit('city:progress',  payload);
  adminNS.emit('city:progress', payload);
}

function broadcastLootPool() {
  const pool = Array.from(lootPool.values());
  gameNS.emit('loot:pool_update', pool);
}

function broadcastFinaleLobby() {
  const list = Array.from(finalePlayers.values());
  gameNS.emit('finale:lobby_update', list);
}

// Flash quiz: pick a new question that wasn't the last one
function pickFlashQuestion() {
  // Inline question list to avoid require() complexity in CJS
  const QUESTIONS = [
    { id: 'fq_symbol',     question: 'Kāds ir Liepājas neoficiālais simbols?',           options: ['Dzintars','Vējš','Jūra','Roze'],                           answer: 'Vējš',              communityPoints: 3 },
    { id: 'fq_year',       question: 'Kurā gadā Liepāja ieguva pilsētas tiesības?',       options: ['1595','1625','1655','1700'],                                answer: '1625',             communityPoints: 3 },
    { id: 'fq_festival',   question: 'Kā sauc Liepājas mūzikas festivālu?',               options: ['Positivus','Laima Rendezvous','Liepājas Dzintars','Rīgas Ritmi'], answer: 'Laima Rendezvous', communityPoints: 3 },
    { id: 'fq_population', question: 'Cik iedzīvotāju ir Liepājā (aptuveni)?',            options: ['40 000','60 000','80 000','100 000'],                      answer: '60 000',           communityPoints: 3 },
    { id: 'fq_karosta',    question: 'Kā sauc bijušo militāro kvartālu Liepājas ziemeļos?', options: ['Karadarbības zona','Karosta','Militārā bāze','Ziemeļu rajons'], answer: 'Karosta',         communityPoints: 3 },
  ];
  let idx;
  do { idx = Math.floor(Math.random() * QUESTIONS.length); } while (idx === flashQuizLastIdx && QUESTIONS.length > 1);
  flashQuizLastIdx = idx;
  return QUESTIONS[idx];
}

function maybeStartFlashQuiz() {
  if (flashQuiz) return; // already running
  if (players.size < FLASH_QUIZ_MIN_PLAYERS) return;

  const question = pickFlashQuestion();
  const quizId   = `fq_${Date.now()}`;
  const responses = new Map();

  flashQuiz = { quizId, question, startedAt: Date.now(), responses };

  gameNS.emit('flash_quiz:start', {
    quizId,
    question:  question.question,
    options:   question.options,
    timeLimit: FLASH_QUIZ_TIME_LIMIT / 1000,
  });
  pushLog('info', `Flash viktorīna sākusies: ${question.id} (${players.size} spēlētāji)`);

  flashQuiz.timer = setTimeout(() => resolveFlashQuiz(), FLASH_QUIZ_TIME_LIMIT);
}

function resolveFlashQuiz() {
  if (!flashQuiz) return;
  const { quizId, question, responses } = flashQuiz;

  let correctCount = 0;
  responses.forEach(ans => { if (ans === question.answer) correctCount++; });

  const majority  = correctCount > responses.size / 2;
  const communityPoints = majority ? question.communityPoints : 0;
  if (majority) globalProgress += communityPoints;

  gameNS.emit('flash_quiz:result', {
    quizId,
    correctAnswer:  question.answer,
    correctCount,
    totalResponses: responses.size,
    communityPoints,
    majority,
  });
  broadcastGlobalProgress();
  pushLog('info', `Flash viktorīna beigusies: ${correctCount}/${responses.size} pareizi, +${communityPoints} kopīgie punkti`);

  clearTimeout(flashQuiz.timer);
  flashQuiz = null;

  // Schedule next quiz after 60 s if still enough players
  setTimeout(() => maybeStartFlashQuiz(), 60_000);
}

// ── HTTP + Socket.io ──────────────────────────────────────────────────────────
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

adminNS.use((socket, next) => {
  if (!ADMIN_SECRET) return next(new Error('Admin namespace disabled: set ADMIN_SECRET on server'));
  if (socket.handshake.auth.secret === ADMIN_SECRET) return next();
  next(new Error('Unauthorized'));
});

// ════════════════════════════════════════════════════════════════════════════
// /game namespace
// ════════════════════════════════════════════════════════════════════════════
gameNS.on('connection', (socket) => {

  // ── Player registration ────────────────────────────────────────────────────
  socket.on('player:join', ({ name }) => {
    const safeNm = safeName(name);
    if (!safeNm) return;
    players.set(socket.id, {
      socketId: socket.id, name: safeNm, score: 0, currentLocation: null,
      locationsCompleted: 0, joinedAt: Date.now(), lastActive: Date.now(),
      latencyMs: null, flagged: false, coopSessionId: null,
    });
    pushLog('info', `Spēlētājs pievienojās: ${safeNm}`, { player: safeNm });
    broadcastPlayerList();
    broadcastMapPresence();
    socket.emit('questions:overrides', Object.fromEntries(questionOverrides));
    socket.emit('loot:pool_update', Array.from(lootPool.values()));
    broadcastGlobalProgress();
    maybeStartFlashQuiz();
  });

  // ── Location presence ──────────────────────────────────────────────────────
  // JOIN_LOCATION: player enters a location's minigame
  socket.on('location:join', ({ locationId }) => {
    const p = players.get(socket.id);
    if (!p || !locationId) return;

    p.currentLocation = locationId;
    p.lastActive      = Date.now();
    socket.join(`loc:${locationId}`);

    // Notify all players about the new presence pulse
    gameNS.emit('location:pulse', { locationId, playerName: p.name });
    broadcastMapPresence();
    pushLog('info', `${p.name} ienāca: ${locationId}`, { player: p.name, location: locationId });
    broadcastPlayerList();

    // Check if a coop partner is already at this location (dual-key check)
    const partner = _findCoopPartner(socket.id, locationId);
    if (partner) {
      _startCoopSession(socket.id, partner.socketId, locationId);
    }

    // Legacy alias for admin tracking
    socket.emit('ack:location_join', { locationId });
  });

  // LEAVE_LOCATION: player leaves a location (back to map or next phase)
  socket.on('location:leave', ({ locationId }) => {
    const p = players.get(socket.id);
    if (!p) return;
    socket.leave(`loc:${locationId}`);
    if (p.currentLocation === locationId) p.currentLocation = null;
    broadcastMapPresence();
  });

  // ── player:complete (existing + coop multiplier) ──────────────────────────
  socket.on('player:complete', ({ locationId, score, elapsedSecs }) => {
    const p = players.get(socket.id);
    if (!p) return;

    let finalScore = typeof score === 'number' ? score : p.score;

    // Apply coop multiplier if partner just completed the same location
    const session = _getCoopSession(socket.id, locationId);
    if (session && session.status === 'active') {
      finalScore = Math.round(finalScore * COOP_MULTIPLIER);
      socket.emit('coop:multiplier_applied', { multiplier: COOP_MULTIPLIER, locationId, newScore: finalScore });
      pushLog('info', `Co-op ×${COOP_MULTIPLIER} piemērots: ${p.name} @ ${locationId}`);
    }

    p.score              = finalScore;
    p.currentLocation    = null;
    p.locationsCompleted = (p.locationsCompleted || 0) + 1;
    p.lastActive         = Date.now();
    globalProgress++;

    // Anti-cheat
    if (typeof elapsedSecs === 'number' && elapsedSecs < ANTICHEAT_MIN_SECS) {
      p.flagged = true;
      pushLog('warn', `[ANTI-CHEAT] ${p.name} pabeidza "${locationId}" ${elapsedSecs}s (min ${ANTICHEAT_MIN_SECS}s)`,
        { player: p.name, location: locationId, elapsedSecs, flagged: true });
      adminNS.emit('anticheat:flag', { socketId: socket.id, name: p.name, locationId, elapsedSecs });
    } else {
      pushLog('info', `${p.name} pabeidza: ${locationId} (${elapsedSecs}s, +${finalScore} pts)`,
        { player: p.name, location: locationId, elapsedSecs, score: finalScore });
    }

    // Check for loot item at this location
    _checkLootSpawn(socket.id, locationId);

    socket.leave(`loc:${locationId}`);
    broadcastMapPresence();
    broadcastPlayerList();
    broadcastGlobalProgress();
  });

  // ── Coop: dual-key validation ─────────────────────────────────────────────
  // COOP_REQUEST: manually request a partner (UI button)
  socket.on('coop:request', ({ targetSocketId, locationId }) => {
    const p = players.get(socket.id);
    if (!p) return;
    gameNS.to(targetSocketId).emit('coop:requested', {
      requesterId:   socket.id,
      requesterName: p.name,
      locationId,
    });
    pushLog('info', `${p.name} piedāvāja kooperāciju @ ${locationId}`);
  });

  // COOP_ACCEPT: target accepts the coop request
  socket.on('coop:accept', ({ requesterId, locationId }) => {
    _startCoopSession(requesterId, socket.id, locationId);
  });

  // SHARE_CLUE: clue_holder forwards a clue to questioner
  socket.on('clue:share', ({ targetSocketId, clue, locationId }) => {
    const p = players.get(socket.id);
    if (!p) return;
    gameNS.to(targetSocketId).emit('clue:received', {
      clue,
      fromName:   p.name,
      locationId,
    });
    pushLog('info', `Mājienu nosūtīja ${p.name} → ${targetSocketId}`);
  });

  // DUAL_KEY_SUBMIT: questioner submits the answer for dual-key task
  socket.on('dual_key:submit', ({ sessionId, locationId, correct }) => {
    const session = coopSessions.get(sessionId);
    if (!session) return;

    session.status = 'complete';
    coopSessions.delete(sessionId);

    if (correct) {
      // Both players get the multiplier (handled client-side via player:complete)
      [session.questionerId, session.clueHolderId].forEach(sid => {
        gameNS.to(sid).emit('dual_key:result', { success: true, multiplier: COOP_MULTIPLIER, locationId });
      });
      pushLog('info', `Dual-key izdevās @ ${locationId}`);
    } else {
      // Adaptive penalty: both players lose points
      [session.questionerId, session.clueHolderId].forEach(sid => {
        const pl = players.get(sid);
        if (pl) {
          pl.score = Math.max(0, pl.score - COOP_PENALTY);
        }
        gameNS.to(sid).emit('dual_key:result', { success: false, penalty: COOP_PENALTY, locationId });
      });
      broadcastPlayerList();
      pushLog('warn', `Dual-key neizdevās @ ${locationId} — sods ${COOP_PENALTY} punkti katram`);
    }
  });

  // SYNC_TASK_PROGRESS: share task progress (e.g. % of minigame done)
  socket.on('sync_task:progress', ({ locationId, progress }) => {
    const p = players.get(socket.id);
    if (!p) return;
    socket.to(`loc:${locationId}`).emit('sync_task:update', {
      locationId,
      progress,
      playerName: p.name,
      socketId:   socket.id,
    });
  });

  // ── Loot pool ──────────────────────────────────────────────────────────────
  // LOOT_FOUND: player found a loot item at a location
  socket.on('loot:found', ({ itemId, locationId }) => {
    const p = players.get(socket.id);
    if (!p || lootPool.has(itemId)) return;
    lootPool.set(itemId, { itemId, foundBy: p.name, foundAt: locationId });
    broadcastLootPool();
    pushLog('info', `Priekšmets atrasts: ${itemId} (${p.name} @ ${locationId})`, { player: p.name });
  });

  // LOOT_USE: player consumes a loot item for a bonus
  socket.on('loot:use', ({ itemId, targetLocationId }) => {
    const p    = players.get(socket.id);
    const item = lootPool.get(itemId);
    if (!p || !item) return;

    lootPool.delete(itemId);
    p.score += 5; // bonusPoints for using loot
    broadcastLootPool();
    socket.emit('loot:bonus', { itemId, bonusPoints: 5, targetLocationId });
    broadcastPlayerList();
    pushLog('info', `Priekšmets izmantots: ${itemId} (${p.name} @ ${targetLocationId})`);
  });

  // ── Flash quiz ─────────────────────────────────────────────────────────────
  // FLASH_QUIZ_ANSWER: player submits an answer
  socket.on('flash_quiz:answer', ({ quizId, answer }) => {
    if (!flashQuiz || flashQuiz.quizId !== quizId) return;
    if (flashQuiz.responses.has(socket.id)) return; // already answered
    flashQuiz.responses.set(socket.id, answer);

    // Resolve early if all connected players answered
    if (flashQuiz.responses.size >= players.size) {
      clearTimeout(flashQuiz.timer);
      resolveFlashQuiz();
    }
  });

  // ── Finale lobby ───────────────────────────────────────────────────────────
  // FINALE_JOIN: player has finished all 10 locations
  socket.on('finale:join', ({ score, timeSeconds }) => {
    const p = players.get(socket.id);
    if (!p) return;
    finalePlayers.set(socket.id, {
      socketId:    socket.id,
      name:        p.name,
      score,
      timeSeconds,
      completedAt: Date.now(),
    });
    broadcastFinaleLobby();
    pushLog('info', `${p.name} pievienojās fināla lobijam (${score} pts, ${timeSeconds}s)`);
  });

  // ── Ping ──────────────────────────────────────────────────────────────────
  socket.on('ping:req', () => socket.emit('ping:ack', { serverTs: Date.now() }));

  socket.on('ping:report', ({ latencyMs }) => {
    const p = players.get(socket.id);
    if (!p) return;
    p.latencyMs  = typeof latencyMs === 'number' ? latencyMs : null;
    p.lastActive = Date.now();
    broadcastPlayerList();
  });

  // ── Lobby (multiplayer rooms) ──────────────────────────────────────────────
  socket.on('lobby:create', () => {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    lobbies.set(code, {
      code, host: socket.id, guest: null,
      hostReady: false, guestReady: false,
      hostDone: false,  guestDone: false,
      lastActive: Date.now(), created: Date.now(),
      hostTimeout: null, guestTimeout: null,
    });
    socket.join(`lobby:${code}`);
    socket.emit('lobby:created', { code });
    pushLog('info', `Lobby izveidots: ${code}`);
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
    pushLog('info', `Spēlētājs pievienojās lobby: ${code}`);
  });

  socket.on('lobby:ready', ({ code, role }) => {
    const lobby = lobbies.get(code);
    if (!lobby) return socket.emit('lobby:error', { msg: 'Istaba nav atrasta.' });
    if (role === 'host')  lobby.hostReady  = true;
    if (role === 'guest') lobby.guestReady = true;
    lobby.lastActive = Date.now();
    if (lobby.hostReady && lobby.guestReady) {
      gameNS.to(`lobby:${code}`).emit('lobby:start', {});
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

  // ── Disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', (reason) => {
    const p = players.get(socket.id);
    if (p) {
      pushLog('info', `Spēlētājs atvienojās: ${p.name} (${reason})`, { player: p.name });
      players.delete(socket.id);
      finalePlayers.delete(socket.id);
      broadcastMapPresence();
      broadcastPlayerList();
      broadcastGlobalProgress();
      broadcastFinaleLobby();
    }

    // Cleanup any coop sessions this player was part of
    for (const [sid, session] of coopSessions) {
      if (session.questionerId === socket.id || session.clueHolderId === socket.id) {
        const partnerId = session.questionerId === socket.id ? session.clueHolderId : session.questionerId;
        gameNS.to(partnerId).emit('coop:partner_left', { locationId: session.locationId });
        coopSessions.delete(sid);
      }
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
          gameNS.to(`lobby:${code}`).emit('lobby:player_disconnected', { msg: 'Otrs spēlētājs atvienojās.' });
          if (!lobby.host && !lobby.guest) lobbies.delete(code);
        }
      }, RECONNECT_GRACE);
    }
  });
});

// ── Coop session helpers ──────────────────────────────────────────────────────
function _findCoopPartner(socketId, locationId) {
  for (const [sid, p] of players) {
    if (sid !== socketId && p.currentLocation === locationId) return p;
  }
  return null;
}

function _getCoopSession(socketId, locationId) {
  for (const session of coopSessions.values()) {
    if ((session.questionerId === socketId || session.clueHolderId === socketId)
      && session.locationId === locationId && session.status === 'active') {
      return session;
    }
  }
  return null;
}

function _startCoopSession(questionerId, clueHolderId, locationId) {
  const DUAL_KEY = { rtu: true, cietums: true };
  if (!DUAL_KEY[locationId]) return;

  const sessionId = `cs_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  coopSessions.set(sessionId, { sessionId, locationId, questionerId, clueHolderId, status: 'active' });

  const qp = players.get(questionerId);
  const cp = players.get(clueHolderId);
  if (qp) qp.coopSessionId = sessionId;
  if (cp) cp.coopSessionId = sessionId;

  const CLUES = {
    rtu:     ['RTU akadēmija dibināta pēc Otrā pasaules kara.', 'Gads beidzas ar ciparu "4".', 'Piecdesmitie gadi.', 'Konkrēti — 1954. gads.'],
    cietums: ['Celts cara Krievijas laikā.', 'Gadsimta mijā — ap 1900. gadu.', 'Precīzi pirmais gadsimta gads.', 'Gads ir 1900.'],
  };

  gameNS.to(questionerId).emit('coop:session_start', {
    sessionId, locationId, role: 'questioner',
    partnerName: cp?.name || '?',
  });
  gameNS.to(clueHolderId).emit('coop:session_start', {
    sessionId, locationId, role: 'clue_holder',
    partnerName:     qp?.name || '?',
    questionerSocketId: questionerId,
    clues:           CLUES[locationId] || [],
  });
  pushLog('info', `Co-op sesija sākta @ ${locationId}: ${qp?.name} & ${cp?.name}`);
}

function _checkLootSpawn(socketId, locationId) {
  // Items spawn when the player completes specific locations
  const SPAWN_TABLE = { osta: 'port_pass', kanals: 'canal_key', dzintars: 'concert_note', mols: 'lighthouse_map' };
  const itemId = SPAWN_TABLE[locationId];
  if (!itemId || lootPool.has(itemId)) return;
  const p = players.get(socketId);
  if (!p) return;
  lootPool.set(itemId, { itemId, foundBy: p.name, foundAt: locationId });
  // Notify the finder
  gameNS.to(socketId).emit('loot:found_notification', { itemId });
  broadcastLootPool();
  pushLog('info', `Priekšmets parādījās: ${itemId} (${p.name} @ ${locationId})`);
}

// ════════════════════════════════════════════════════════════════════════════
// /admin namespace
// ════════════════════════════════════════════════════════════════════════════
adminNS.on('connection', (socket) => {
  pushLog('info', 'Admin pievienojās');

  // Snapshot
  socket.emit('admin:players',       Array.from(players.values()));
  socket.emit('log:history',         liveLogs.slice());
  socket.emit('questions:overrides', Object.fromEntries(questionOverrides));
  socket.emit('loot:pool_update',    Array.from(lootPool.values()));
  socket.emit('finale:lobby_update', Array.from(finalePlayers.values()));
  const total = Math.max(players.size * 10, 1);
  socket.emit('city:progress', {
    completed: globalProgress, total,
    pct: Math.min(100, Math.round((globalProgress / total) * 100)),
  });

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
    if (p) { p.flagged = false; broadcastPlayerList(); pushLog('info', `Karodziņš notīrīts: ${p.name}`); }
  });

  socket.on('admin:trigger_flash_quiz', () => {
    if (!flashQuiz) maybeStartFlashQuiz();
    pushLog('info', 'Admin aktivizēja flash viktorīnu');
  });

  socket.on('disconnect', () => pushLog('info', 'Admin atvienojās'));
});

// ── Periodic cleanup ──────────────────────────────────────────────────────────
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
  console.log(`[server] Ekskursija socket server on :${PORT}`);
  if (!ADMIN_SECRET) {
    console.warn('[server] ⚠  Admin panel is DISABLED — set ADMIN_SECRET env var to enable it.');
  } else {
    console.log('[server] ✓ Admin namespace active.');
  }
});

process.on('SIGTERM', () => io.close(() => httpServer.close(() => process.exit(0))));

