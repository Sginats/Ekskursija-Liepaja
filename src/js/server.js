const WebSocket = require('ws');

// Create WebSocket server with enhanced configuration
const wss = new WebSocket.Server({ 
    port: 8080,
    perMessageDeflate: false, // Disable compression for better performance on small messages
    clientTracking: true
});

const lobbies = {};

// Heartbeat interval (checks if clients are alive)
const HEARTBEAT_INTERVAL = 30000;
const CLEANUP_INTERVAL = 600000; // 10 minutes
const LOBBY_TIMEOUT = 3600000; // 1 hour

const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) {
            console.log('Terminating inactive client');
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, HEARTBEAT_INTERVAL);

wss.on('close', function close() {
    clearInterval(interval);
});

console.log("🚀 Professional WebSocket server started on port 8080!");
console.log("Features: Auto-reconnect, Heartbeat, Lobby cleanup");

wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });
    
    console.log(`New client connected from ${req.socket.remoteAddress}`);

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
                console.log(`Lobby created: ${newCode}`);
            }

            else if (action === 'join') {
                if (!lobbies[code]) {
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        msg: 'Istaba nav atrasta. Pārbaudi kodu.' 
                    }));
                    return;
                }
                
                if (lobbies[code].guest) {
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        msg: 'Istaba jau ir pilna.' 
                    }));
                    return;
                }
                
                lobbies[code].guest = ws;
                lobbies[code].lastActive = Date.now();
                
                // Notify both players
                if (lobbies[code].host.readyState === WebSocket.OPEN) {
                    lobbies[code].host.send(JSON.stringify({ type: 'start_game', role: 'host' }));
                }
                ws.send(JSON.stringify({ type: 'start_game', role: 'guest' }));
                console.log(`Player joined lobby: ${code}`);
            }

            else if (action === 'update_task') {
                if (!lobbies[code]) {
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        msg: 'Istaba vairs nav aktīva.' 
                    }));
                    return;
                }
                
                if (role === 'host') lobbies[code].hostDone = true;
                if (role === 'guest') lobbies[code].guestDone = true;
                lobbies[code].lastActive = Date.now();

                if (lobbies[code].hostDone && lobbies[code].guestDone) {
                    const msg = JSON.stringify({ type: 'sync_complete' });
                    
                    if (lobbies[code].host.readyState === WebSocket.OPEN) {
                        lobbies[code].host.send(msg);
                    }
                    if (lobbies[code].guest && lobbies[code].guest.readyState === WebSocket.OPEN) {
                        lobbies[code].guest.send(msg);
                    }
                    
                    // Reset
                    lobbies[code].hostDone = false;
                    lobbies[code].guestDone = false;
                    console.log(`Task synchronized in lobby: ${code}`);
                }
            }

            else if (action === 'ping') {
                ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }

        } catch (e) { 
            console.error("WebSocket message error:", e);
            ws.send(JSON.stringify({ 
                type: 'error', 
                msg: 'Servera kļūda. Lūdzu, mēģini vēlreiz.' 
            }));
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`Client disconnected. Code: ${code}, Reason: ${reason}`);
        
        // Remove client from lobbies
        for (const lobbyCode in lobbies) {
            const lobby = lobbies[lobbyCode];
            if (lobby.host === ws || lobby.guest === ws) {
                // Notify the other player
                const otherPlayer = lobby.host === ws ? lobby.guest : lobby.host;
                if (otherPlayer && otherPlayer.readyState === WebSocket.OPEN) {
                    otherPlayer.send(JSON.stringify({
                        type: 'player_disconnected',
                        msg: 'Otrs spēlētājs atvienojās.'
                    }));
                }
                delete lobbies[lobbyCode];
                console.log(`Lobby ${lobbyCode} closed due to player disconnect`);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

// Cleanup: Delete lobbies older than 1 hour
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const code in lobbies) {
        if (now - lobbies[code].lastActive > LOBBY_TIMEOUT) {
            // Close connections gracefully
            if (lobbies[code].host.readyState === WebSocket.OPEN) {
                lobbies[code].host.close(1000, 'Lobby timeout');
            }
            if (lobbies[code].guest && lobbies[code].guest.readyState === WebSocket.OPEN) {
                lobbies[code].guest.close(1000, 'Lobby timeout');
            }
            
            delete lobbies[code];
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`Cleaned ${cleaned} stale lobbies`);
    }
}, CLEANUP_INTERVAL);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    wss.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});