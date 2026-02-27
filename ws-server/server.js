const WebSocket = require('ws');
require('dotenv').config();

const port = process.env.WS_PORT || 8080;
const wss = new WebSocket.Server({ port: port });
const lobbies = {};

// Sirdspukstu intervāls (pārbauda vai klienti ir dzīvi)
const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', function close() {
    clearInterval(interval);
});

console.log(`🚀 Serveris optimizēts un palaists uz ${port}!`);

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const { action, code, role } = data;

            if (action === 'create') {
                const newCode = Math.floor(1000 + Math.random() * 9000).toString();
                lobbies[newCode] = { host: ws, guest: null, hostDone: false, guestDone: false, lastActive: Date.now() };
                ws.send(JSON.stringify({ type: 'created', code: newCode }));
            }

            if (action === 'join') {
                if (lobbies[code] && !lobbies[code].guest) {
                    lobbies[code].guest = ws;
                    if(lobbies[code].host.readyState === WebSocket.OPEN) 
                        lobbies[code].host.send(JSON.stringify({ type: 'start_game', role: 'host' }));
                    ws.send(JSON.stringify({ type: 'start_game', role: 'guest' }));
                } else {
                    ws.send(JSON.stringify({ type: 'error', msg: 'Istaba nav pieejama.' }));
                }
            }

            if (action === 'update_task') {
                if (lobbies[code]) {
                    if (role === 'host') lobbies[code].hostDone = true;
                    if (role === 'guest') lobbies[code].guestDone = true;
                    lobbies[code].lastActive = Date.now();

                    if (lobbies[code].hostDone && lobbies[code].guestDone) {
                        const msg = JSON.stringify({ type: 'sync_complete' });
                        lobbies[code].host.send(msg);
                        lobbies[code].guest.send(msg);
                        // Reset
                        lobbies[code].hostDone = false;
                        lobbies[code].guestDone = false;
                    }
                }
            }
        } catch (e) { console.error("WS Error:", e); }
    });
});

// Tīrītājs: Dzēš istabas, kas vecākas par 1 stundu
setInterval(() => {
    const now = Date.now();
    for (const code in lobbies) {
        if (now - lobbies[code].lastActive > 3600000) {
            delete lobbies[code];
            console.log(`Deleted stale lobby: ${code}`);
        }
    }
}, 600000);