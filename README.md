# Macību ekskursija Liepājā

Interaktīva tīmekļa spēle par Liepājas kultūrvēsturiskajām vietām. Izpēti 10 apmeklējuma punktus kartē, atbildi uz jautājumiem un sacenšoties par vietu Top 10!

**Autori:** Niks Šenvalds, Dans Bitenieks (Grupa 2PT)

---

## Ekrānuzņēmumi

| Galvenā izvēlne | Karte |
|---|---|
| ![Galvenā izvēlne](atteli/screenshots/menu.png) | ![Karte](atteli/screenshots/map.png) |

| Spēles režīms | Iestatījumi |
|---|---|
| ![Spēles režīms](atteli/screenshots/mode.png) | ![Iestatījumi](atteli/screenshots/settings.png) |

---

## Spēles noteikumi

1. Apmeklē **10 vietas** Liepājā noteiktā secībā.
2. Katrā vietā saņem informāciju un **uzdevumu** (jautājums, mini-spēle vai secības uzdevums).
3. **Punkti:** pareiza atbilde 1. mēģinājumā → **+10 pkt**, pēc kļūdas → **+5 pkt**, 2 kļūdas → **0 pkt** (atbilde parādās automātiski).
4. **Noslēguma tests:** 5 jautājumi par Liepāju (katra pareiza atbilde: +2 bonusa punkti, maks. +10).
5. Maksimālais rezultāts: **110 punkti**. Saglabā rezultātu un iekļūsti **Top 10**!

---

## Galvenās funkcijas

- **Viena spēlētāja** un **multiplayer** režīms (reālā laika co-op ar draugu)
- **Mini-spēles:** laivas sacīkstes, kukaiņu ķeršana, vēstures secības kārtošana
- **Flash viktorīna** (≥3 spēlētāji, 20s limits) ar kopīgiem bonusa punktiem
- **4 krāsu tēmas**, animēts daļiņu fons, mūzikas/SFX iestatījumi
- **Top 10 tabula** ar kombinētu punktu + laika vērtējumu
- **Anti-cheat** un **admin panelis** jautājumu maiņai un spēlētāju pārvaldībai

---

## Tehnoloģijas

| Slānis | Rīki |
|--------|------|
| Frontend | React, Vite, HTML, CSS, JavaScript, Bootstrap 5.3.2 |
| Spēļu dzinējs | Phaser 3 (mini-spēles) |
| Backend | Node.js + PHP (leaderboard, multiplayer lobby) |
| Real-time | Socket.IO 4.8 + raw WebSocket |
| Datubāze | Supabase (PostgreSQL) |

---

## Struktūra

```
Ekskursija-Liepaja/
├── index.html / map.html          # Galvenā izvēlne un karte
├── style.css                      # Globālie stili
├── atteli/ / skana/               # Attēli un audio
├── src/
│   ├── js/script.js               # Spēles loģika
│   ├── js/server.js               # Socket.IO + raw WS serveris
│   ├── php/                       # Backend (leaderboard, lobby, anti-cheat)
│   └── data/                      # JSON dati (jautājumi, atbildes, lobbies)
├── client/                        # React + Phaser — viena spēlētāja režīms
└── game/                          # React + Phaser — multiplayer režīms
    └── src/utils/SocketManager.js  # Socket.IO klients
```
require('dotenv').config();
const http       = require('http');
const { Server } = require('socket.io');
const { WebSocketServer, WebSocket: WsWebSocket } = require('ws');

// --- Config ---
const port      = process.env.PORT || 3000;
const wsPort    = process.env.WS_PORT   || 3001;
const fastifyPort = process.env.API_PORT  || 3002;
const publicDir = process.env.PUBLIC_DIR  || 'public';
const devMode   = process.env.NODE_ENV === 'development';
const logAll    = process.env.LOG_ALL     === 'true';

// --- Util ---
const lobbies     = new Map();
const wsClients   = new WeakMap();
const timers      = new WeakMap();
const sockets     = new WeakSet();

// --- Logging ---
function pushLog(type, log) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`${ts} ${type.toUpperCase().padEnd(5)} ${log}`);
}

// --- HTTP(S) server ---
const httpserver = http.createServer((req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url;
  if (url.endsWith('/')) return redir(url);
  if (url.includes('..')) return refuse();

  try {
    const file = fs.readFileSync(path.join(process.cwd(), publicDir, url));
    const type = {
      '.html': 'text/html',
      '.css':  'text/css',
      '.js':   'text/javascript',
      '.json': 'application/json',
      '.png':  'image/png',
      '.jpg':  'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif':  'image/gif',
      '.svg':  'image/svg+xml',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf':  'font/ttf',
      '.otf':  'font/otf',
    }[path.extname(url)] || 'text/plain';

    res.writeHead(200, { 'Content-Type': type });
    res.end(file);
    if (logAll) pushLog('http', `${req.method} ${url} ${res.statusCode}`);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    pushLog('http', `${req.method} ${url} ${res.statusCode} (404)`);
  }

  function refuse() {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    pushLog('http', `${req.method} ${url} ${res.statusCode}`);
  }

  function redir(url) {
    res.writeHead(301, { 'Location': url + 'index.html' });
    res.end();
    pushLog('http', `${req.method} ${url} ${res.statusCode} (redir)`);
  }
});

// --- Websocket server ---
const wss = new WebSocketServer({ port: wsPort });
pushLog('init', `WebSocket serveris darbojas portā ${wsPort}`);

function wsSend(conn, obj) {
  if (conn && conn.readyState === WsWebSocket.OPEN) {
    conn.send(JSON.stringify(obj));
  }
}

// --- Add: heartbeat to survive proxies/load balancers ---
function markAlive() { this.isAlive = true; }

const HEARTBEAT_MS = 15_000;
setInterval(() => {
  for (const client of wss.clients) {
    if (client.isAlive === false) {
      try { client.terminate(); } catch (_) {}
      continue;
    }
    client.isAlive = false;
    try { client.ping(); } catch (_) {}
  }
}, HEARTBEAT_MS);

// --- Websocket logic ---
wss.on('connection', (wsConn) => {
  wsConn.isAlive = true;
  wsConn.on('pong', markAlive);

  wsConn.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    if (msg.action === 'create') {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      lobbies.set(code, {
        code, host: wsConn, guest: null,
        hostReady: false, guestReady: false,
        hostDone: false, guestDone: false,
        lastActive: Date.now(), created: Date.now(),
        hostTimeout: null, guestTimeout: null,
        _isLegacy: true,

        // dedupe fields (safe even if never used)
        _lastReadyHost: null,
        _lastReadyGuest: null,
        _lastDoneHost: null,
        _lastDoneGuest: null,
      });
      wsClients.set(wsConn, code);
      wsSend(wsConn, { type: 'created', code });
      pushLog('info', `[ws] Lobby izveidots: ${code}`);
    }

    else if (msg.action === 'join') {
      if (!msg.code) return wsSend(wsConn, { type: 'error', msg: 'Nav koda.' });
      const lobby = lobbies.get(msg.code);
      if (!lobby || !lobby._isLegacy) return wsSend(wsConn, { type: 'error', msg: 'Istaba nav atrasta.' });
      if (lobby.guest) return wsSend(wsConn, { type: 'error', msg: 'Istaba ir pilna.' });

      lobby.guest = wsConn;
      wsClients.set(wsConn, msg.code);
      wsSend(wsConn, { type: 'joined', code: msg.code });
      wsSend(lobby.host, { type: 'player_joined' });
      pushLog('info', `[ws] Spēlētājs pievienojās lobby: ${msg.code}`);
    }

    else if (msg.action === 'leave') {
      const code = wsClients.get(wsConn);
      if (!code) return;
      const lobby = lobbies.get(code);
      if (!lobby || !lobby._isLegacy) return;

      if (lobby.host === wsConn) lobby.host = null;
      if (lobby.guest === wsConn) lobby.guest = null;
      wsClients.delete(wsConn);

      if (lobby.host) wsSend(lobby.host, { type: 'player_left' });
      if (lobby.guest) wsSend(lobby.guest, { type: 'player_left' });

      // cleanup
      clearTimeout(lobby.hostTimeout);
      clearTimeout(lobby.guestTimeout);

      lobbies.delete(code);
      pushLog('info', `[ws] Spēlētājs pameta lobby: ${code} (existing=${!!lobby.host})`);
    }

    else if (msg.action === 'ready') {
      const lobby = lobbies.get(msg.code);
      if (!lobby || !lobby._isLegacy) return wsSend(wsConn, { type: 'error', msg: 'Istaba nav atrasta.' });

      if (msg.role === 'host') {
        if (msg.nonce && lobby._lastReadyHost === msg.nonce) return;
        if (msg.nonce) lobby._lastReadyHost = msg.nonce;
        lobby.hostReady = true;
      }
      if (msg.role === 'guest') {
        if (msg.nonce && lobby._lastReadyGuest === msg.nonce) return;
        if (msg.nonce) lobby._lastReadyGuest = msg.nonce;
        lobby.guestReady = true;
      }

      lobby.lastActive = Date.now();
      if (lobby.hostReady && lobby.guestReady) {
        wsSend(lobby.host, { type: 'start_game', role: 'host' });
        wsSend(lobby.guest, { type: 'start_game', role: 'guest' });
      } else {
        const other = (wsConn === lobby.host) ? lobby.guest : lobby.host;
        wsSend(other, { type: 'player_ready' });
      }
    }

    else if (msg.action === 'update_task') {
      const lobby = lobbies.get(msg.code);
      if (!lobby || !lobby._isLegacy) return;

      if (msg.role === 'host') {
        if (msg.nonce && lobby._lastDoneHost === msg.nonce) return;
        if (msg.nonce) lobby._lastDoneHost = msg.nonce;
        lobby.hostDone = true;
      }
      if (msg.role === 'guest') {
        if (msg.nonce && lobby._lastDoneGuest === msg.nonce) return;
        if (msg.nonce) lobby._lastDoneGuest = msg.nonce;
        lobby.guestDone = true;
      }

      lobby.lastActive = Date.now();
      if (lobby.hostDone && lobby.guestDone) {
        lobby.hostDone = false;
        lobby.guestDone = false;
        wsSend(lobby.host, { type: 'sync_complete' });
        wsSend(lobby.guest, { type: 'sync_complete' });
      }
    }

    else if (msg.action === 'sync_task') {
      const lobby = lobbies.get(msg.code);
      if (!lobby || !lobby._isLegacy) return;

      const other = (wsConn === lobby.host) ? lobby.guest : lobby.host;
      wsSend(other, { type: 'sync_task', data: msg.data });
    }

    else if (msg.action === 'send_chat') {
      const lobby = lobbies.get(msg.code);
      if (!lobby || !lobby._isLegacy) return;

      const other = (wsConn === lobby.host) ? lobby.guest : lobby.host;
      wsSend(other, { type: 'receive_chat', msg: msg.msg });
    }

    else {
      pushLog('warn', `[ws] Nezināma darbība: ${msg.action}`);
    }
  });

  wsConn.on('close', () => {
    const code = wsClients.get(wsConn);
    if (!code) return;
    const lobby = lobbies.get(code);
    if (!lobby || !lobby._isLegacy) return;

    if (lobby.host === wsConn) lobby.host = null;
    if (lobby.guest === wsConn) lobby.guest = null;
    wsClients.delete(wsConn);

    if (lobby.host) wsSend(lobby.host, { type: 'player_left' });
    if (lobby.guest) wsSend(lobby.guest, { type: 'player_left' });

    // cleanup
    clearTimeout(lobby.hostTimeout);
    clearTimeout(lobby.guestTimeout);

    lobbies.delete(code);
    pushLog('info', `[ws] Savienojums pārtraukts, lobby dzēsts: ${code} (existing=${!!lobby.host})`);
  });

  wsConn.on('error', (err) => {
    pushLog('error', `[ws] Kļūda: ${err.message}`);
  });
});

// --- Start ---
httpserver.listen(port, () => {
  pushLog('init', `Serveris darbojas portā ${port}`);
});

## Resursi

- **Karte:** https://maps.apple.com/
- **Gida attēls (Kaija):** Autoru zīmējums (https://www.aseprite.org/)
- **Informācija:** liepaja.lv, rtu.lv, Liepājas muzejs, wikipedia.org
- **Audio:** https://pixabay.com/

---

© 2026 Niks Šenvalds, Dans Bitenieks — izglītības projekts.
