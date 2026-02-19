const WebSocket = require('ws');
const wss = new WebSocket.Server({ 
    port: 8080,
    perMessageDeflate: false,
    clientTracking: true
});
const lobbies = {};
const HEARTBEAT_INTERVAL = 30000;
const CLEANUP_INTERVAL = 600000;
const LOBBY_TIMEOUT = 3600000;
const RECONNECT_GRACE_PERIOD = 30000; 

const heartbeatInterval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, HEARTBEAT_INTERVAL);

wss.on('close', function close() {
    clearInterval(heartbeatInterval);
});

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const { action, code, role } = data;

            if (action === 'create') {
                const newCode = Math.floor(1000 + Math.random() * 9000).toString();
                lobbies[newCode] = { 
                    host: ws, 
                    guest: null, 
                    hostDone: false, 
                    guestDone: false, 
                    lastActive: Date.now(),
                    created: Date.now()
                };
                ws.send(JSON.stringify({ type: 'created', code: newCode }));
            }

            else if (action === 'join') {
                if (!lobbies[code]) {
                    ws.send(JSON.stringify({ type: 'error', msg: 'Istaba nav atrasta. Pārbaudi kodu.' }));
                    return;
                }
                if (lobbies[code].guest) {
                    ws.send(JSON.stringify({ type: 'error', msg: 'Istaba jau ir pilna.' }));
                    return;
                }
                lobbies[code].guest = ws;
                lobbies[code].lastActive = Date.now();
                lobbies[code].hostReady = false;
                lobbies[code].guestReady = false;
                if (lobbies[code].host && lobbies[code].host.readyState === WebSocket.OPEN) {
                    lobbies[code].host.send(JSON.stringify({ type: 'guest_joined' }));
                }
                ws.send(JSON.stringify({ type: 'joined_lobby', code: code }));
            }

            else if (action === 'ready') {
                if (!lobbies[code]) {
                    ws.send(JSON.stringify({ type: 'error', msg: 'Istaba nav atrasta.' }));
                    return;
                }
                if (role === 'host') lobbies[code].hostReady = true;
                if (role === 'guest') lobbies[code].guestReady = true;
                lobbies[code].lastActive = Date.now();

                if (lobbies[code].hostReady && lobbies[code].guestReady) {
                    if (lobbies[code].host && lobbies[code].host.readyState === WebSocket.OPEN) {
                        lobbies[code].host.send(JSON.stringify({ type: 'start_game', role: 'host' }));
                    }
                    if (lobbies[code].guest && lobbies[code].guest.readyState === WebSocket.OPEN) {
                        lobbies[code].guest.send(JSON.stringify({ type: 'start_game', role: 'guest' }));
                    }
                } else {
                    const otherPlayer = role === 'host' ? lobbies[code].guest : lobbies[code].host;
                    if (otherPlayer && otherPlayer.readyState === WebSocket.OPEN) {
                        otherPlayer.send(JSON.stringify({ type: 'player_ready', readyRole: role }));
                    }
                }
            }

            else if (action === 'rejoin') {
                if (!lobbies[code]) {
                    ws.send(JSON.stringify({ type: 'error', msg: 'Istaba nav atrasta.' }));
                    return;
                }
                if (role === 'host') {
                    lobbies[code].host = ws;
                    if (lobbies[code].hostReconnectTimeout) {
                        clearTimeout(lobbies[code].hostReconnectTimeout);
                        lobbies[code].hostReconnectTimeout = null;
                    }
                } else if (role === 'guest') {
                    lobbies[code].guest = ws;
                    if (lobbies[code].guestReconnectTimeout) {
                        clearTimeout(lobbies[code].guestReconnectTimeout);
                        lobbies[code].guestReconnectTimeout = null;
                    }
                }
                lobbies[code].lastActive = Date.now();
                ws.send(JSON.stringify({ type: 'rejoined', role: role }));
            }

            else if (action === 'update_task') {
                if (!lobbies[code]) {
                    ws.send(JSON.stringify({ type: 'error', msg: 'Istaba vairs nav aktīva.' }));
                    return;
                }
                if (role === 'host') lobbies[code].hostDone = true;
                if (role === 'guest') lobbies[code].guestDone = true;
                lobbies[code].lastActive = Date.now();

                if (lobbies[code].hostDone && lobbies[code].guestDone) {
                    const msg = JSON.stringify({ type: 'sync_complete' });
                    if (lobbies[code].host && lobbies[code].host.readyState === WebSocket.OPEN) {
                        lobbies[code].host.send(msg);
                    }
                    if (lobbies[code].guest && lobbies[code].guest.readyState === WebSocket.OPEN) {
                        lobbies[code].guest.send(msg);
                    }
                    lobbies[code].hostDone = false;
                    lobbies[code].guestDone = false;
                }
            }

            else if (action === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }

        } catch (e) { 
            console.error('WebSocket message error:', e.message);
            try {
                ws.send(JSON.stringify({ type: 'error', msg: 'Servera kļūda. Lūdzu, mēģini vēlreiz.' }));
            } catch (_) {}
        }
    });

    ws.on('close', () => {
        for (const lobbyCode in lobbies) {
            const lobby = lobbies[lobbyCode];
            if (lobby.host === ws) {
                lobby.host = null;
                lobby.hostReconnectTimeout = setTimeout(() => {
                    if (!lobby.host) {
                        if (lobby.guest && lobby.guest.readyState === WebSocket.OPEN) {
                            lobby.guest.send(JSON.stringify({ type: 'player_disconnected', msg: 'Otrs spēlētājs atvienojās.' }));
                        }
                        if (!lobby.guest) delete lobbies[lobbyCode];
                    }
                }, RECONNECT_GRACE_PERIOD);
            } else if (lobby.guest === ws) {
                lobby.guest = null;
                lobby.guestReconnectTimeout = setTimeout(() => {
                    if (!lobby.guest) {
                        if (lobby.host && lobby.host.readyState === WebSocket.OPEN) {
                            lobby.host.send(JSON.stringify({ type: 'player_disconnected', msg: 'Otrs spēlētājs atvienojās.' }));
                        }
                        if (!lobby.host) delete lobbies[lobbyCode];
                    }
                }, RECONNECT_GRACE_PERIOD);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error.message);
    });
});

setInterval(() => {
    const now = Date.now();
    for (const code in lobbies) {
        if (now - lobbies[code].lastActive > LOBBY_TIMEOUT) {
            if (lobbies[code].host && lobbies[code].host.readyState === WebSocket.OPEN) {
                lobbies[code].host.close(1000, 'Lobby timeout');
            }
            if (lobbies[code].guest && lobbies[code].guest.readyState === WebSocket.OPEN) {
                lobbies[code].guest.close(1000, 'Lobby timeout');
            }
            delete lobbies[code];
        }
    }
}, CLEANUP_INTERVAL);

process.on('SIGTERM', () => {
    wss.close(() => process.exit(0));
});
