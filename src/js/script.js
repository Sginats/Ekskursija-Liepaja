// ============================================================================
// LIEPĀJAS EKSKURSIJA - GAME LOGIC
// ============================================================================
// Main game script handling map interactions, WebSocket connections,
// quiz system, and user interface management.
// ============================================================================

// Wrap everything in IIFE to prevent console access to game internals
(function() {
'use strict';

// Protected game state
const GameState = (function() {
    let _score = 0;
    let _completedTasks = 0;
    let _checksum = 0;

    function _updateChecksum() {
        _checksum = (_score * 7 + _completedTasks * 13 + 42) ^ 0xA5A5;
    }

    function _verifyIntegrity() {
        return _checksum === ((_score * 7 + _completedTasks * 13 + 42) ^ 0xA5A5);
    }

    _updateChecksum();

    return {
        getScore: function() {
            if (!_verifyIntegrity()) { _score = 0; _completedTasks = 0; _updateChecksum(); }
            return _score;
        },
        addScore: function(points) {
            if (!_verifyIntegrity()) { _score = 0; _completedTasks = 0; }
            _score += points;
            if (_score < 0) _score = 0;
            if (_score > 100) _score = 100;
            _updateChecksum();
            return _score;
        },
        getCompleted: function() {
            if (!_verifyIntegrity()) { _score = 0; _completedTasks = 0; _updateChecksum(); }
            return _completedTasks;
        },
        completeTask: function() {
            if (!_verifyIntegrity()) { _score = 0; _completedTasks = 0; }
            _completedTasks++;
            _updateChecksum();
            return _completedTasks;
        },
        reset: function() {
            _score = 0;
            _completedTasks = 0;
            _updateChecksum();
        }
    };
})();

let currentTask = "";
let startTime; 
let myRole = '';
let myLobbyCode = '';
let globalName = "Anonīms";
let ws = null;

// Spotify configuration
const SPOTIFY_PLAYLIST_URL = 'https://open.spotify.com/playlist/2FJVi4yazmR6yUDFkOu9ep';

// Configuration
const WS_PORT = 8080;
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const POLL_INTERVAL = 2000;
const WS_TIMEOUT = 2000;

const CONNECTION_MODE_PHP = 'php-polling';
const CONNECTION_MODE_WS = 'websocket';
let connectionMode = CONNECTION_MODE_PHP;

const taskSequence = [
    'RTU', 'Dzintars', 'Teatris', 'Kanals', 'Osta', 
    'LSEZ', 'Cietums', 'Mols', 'Ezerkrasts', 'Parks'
];

// XOR-based answer decryption (safer than BASE64)
const _xk = [0x4C, 0x69, 0x65, 0x70, 0xC4, 0x81, 0x6A, 0x61]; // Key
function _d(hex) {
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substring(i, i + 2), 16));
    const dec = bytes.map((b, i) => b ^ _xk[i % _xk.length]);
    return new TextDecoder().decode(new Uint8Array(dec));
}
function _e(str) {
    const enc = new TextEncoder().encode(str);
    return Array.from(enc).map((b, i) => (b ^ _xk[i % _xk.length]).toString(16).padStart(2, '0')).join('');
}

const questions = {
    'RTU': { q: "Kurā gadā dibināta Liepājas akadēmija?", _a: _e("1954"), fact: "Šeit mācās gudrākie prāti!" },
    'Mols': { q: "Cik metrus garš ir Ziemeļu mols?", _a: _e("1800"), fact: "Turi cepuri! Mols sargā ostu." },
    'Cietums': { q: "Kā sauc Karostas tūrisma cietumu?", _a: _e("Karostas cietums"), fact: "Vienīgais militārais cietums atvērts tūristiem!" },
    'Dzintars': { q: "Kā sauc Liepājas koncertzāli?", _a: _e("Lielais Dzintars"), fact: "Izskatās pēc milzīga dzintara!" },
    'Teatris': { q: "Kurā gadā dibināts Liepājas Teātris?", _a: _e("1907"), fact: "Vecākais profesionālais teātris Latvijā!" },
    'Kanals': { q: "Kā sauc kanālu starp ezeru un jūru?", _a: _e("Tirdzniecības"), fact: "Savieno ezeru ar jūru." },
    'Osta': { q: "Kā sauc Liepājas speciālo zonu?", _a: _e("LSEZ"), fact: "Osta šeit neaizsalst." },
    'Parks': { q: "Kā sauc parku pie jūras?", _a: _e("Jūrmalas"), fact: "Viens no lielākajiem parkiem Latvijā!" },
    'LSEZ': { q: "Vai UPB ir Liepājas uzņēmums (Jā/Nē)?", _a: _e("Jā"), fact: "Būvē ēkas visā pasaulē!" },
    'Ezerkrasts': { q: "Kāda ezera krastā ir taka?", _a: _e("Liepājas"), fact: "Piektais lielākais ezers Latvijā." }
};

const locationInfo = {
    'RTU': {
        name: 'RTU Liepājas akadēmija',
        desc: 'Rīgas Tehniskās universitātes Liepājas akadēmija (dibināta 1954. gadā) ir viena no nozīmīgākajām augstākās izglītības iestādēm Kurzemē. Tā piedāvā studiju programmas inženierzinātnēs, IT, ekonomikā un humanitārajās zinātnēs. Ēka atrodas Liepājas centrā un ir svarīgs reģionālās izglītības centrs.'
    },
    'Dzintars': {
        name: 'Koncertzāle "Lielais Dzintars"',
        desc: 'Liepājas koncertzāle "Lielais Dzintars" ir moderna daudzfunkcionāla koncertzāle, kas atklāta 2015. gadā. Ēkas unikālais dizains atgādina milzīgu dzintara gabalu. Šeit regulāri notiek Liepājas Simfoniskā orķestra koncerti, starptautiski festivāli un kultūras pasākumi.'
    },
    'Teatris': {
        name: 'Liepājas Teātris',
        desc: 'Liepājas Teātris, dibināts 1907. gadā, ir vecākais profesionālais teātris Latvijā. Teātris atrodas skaistā jūgendstila ēkā Liepājas centrā. Tas ir nozīmīgs kultūras centrs, kurā tiek iestudētas gan klasiskās, gan mūsdienu lugas.'
    },
    'Kanals': {
        name: 'Tirdzniecības kanāls',
        desc: 'Tirdzniecības kanāls savieno Liepājas ezeru ar Baltijas jūru. Tas ir vēsturiski nozīmīgs ūdensceļš, kas jau kopš 16. gadsimta kalpojis tirdzniecības vajadzībām. Gar kanāla krastiem ir populāra pastaigu vieta ar skaistiem skatiem.'
    },
    'Osta': {
        name: 'Liepājas Osta',
        desc: 'Liepājas osta ir viena no lielākajām un nozīmīgākajām Latvijas ostām. Tā ir unikāla, jo neaizsalst ziemā, pateicoties īpašiem strāvojumu apstākļiem. Ostā darbojas Liepājas Speciālā ekonomiskā zona (LSEZ), kas piesaista starptautiskus uzņēmumus.'
    },
    'LSEZ': {
        name: 'Liepājas Speciālā ekonomiskā zona (LSEZ)',
        desc: 'LSEZ ir izveidota 1997. gadā, lai veicinātu Liepājas reģiona ekonomisko attīstību. Zonā darbojas vairāk nekā 80 uzņēmumi, tostarp UPB — starptautisks būvniecības uzņēmums, kas realizē projektus visā pasaulē. LSEZ piedāvā nodokļu atvieglojumus investoriem.'
    },
    'Cietums': {
        name: 'Karostas cietums',
        desc: 'Karostas cietums ir unikāla tūrisma vieta — vienīgais bijušais militārais cietums Eiropā, kas atvērts apmeklētājiem. Cietums celts 1900. gadā cara armijas vajadzībām. Šobrīd tas piedāvā ekskursijas un nakšņošanas pieredzi autentiskā cietuma vidē.'
    },
    'Mols': {
        name: 'Ziemeļu mols',
        desc: 'Ziemeļu mols ir aptuveni 1800 metrus garš akmeņu mols Liepājas ostas ziemeļu daļā. Tas ir populāra pastaigu un makšķerēšanas vieta. No mola paveras brīnišķīgs skats uz Baltijas jūru un Liepājas piekrasti.'
    },
    'Ezerkrasts': {
        name: 'Ezerkrasta taka',
        desc: 'Ezerkrasta taka atrodas pie Liepājas ezera — piektā lielākā ezera Latvijā. Taka piedāvā skaistu pastaigu maršrutu gar ezera krastu ar skatu platformām un informatīviem stendiem par apkārtnes dabu un putniem.'
    },
    'Parks': {
        name: 'Jūrmalas parks',
        desc: 'Jūrmalas parks ir viens no lielākajiem un vecākajiem parkiem Latvijā, ierīkots 19. gadsimta beigās. Parks atrodas starp pilsētas centru un jūras piekrasti. Tajā aug vairāk nekā 170 koku un krūmu sugas, un parks ir iecienīta atpūtas vieta.'
    }
};

// ============================================================================
// INITIALIZATION & EVENT LISTENERS
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    getQueryParams();
    startTime = Date.now();
    
    // Initialize theme
    initTheme();
    
    const pathname = window.location.pathname;
    const needsConnection = (pathname.endsWith('index.html') || pathname === '/' || pathname.endsWith('/')) || 
                          (myRole && myLobbyCode);
    
    if (needsConnection) {
        const statusIndicator = document.getElementById('connection-status');
        if (statusIndicator) {
            statusIndicator.style.display = 'block';
        }
        
        initSmartConnection();
    }
    
    if(document.querySelector('.point')) updateMapState();

    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
        document.querySelectorAll('.point').forEach(p => {
            p.addEventListener('mouseover', (e) => {
                tooltip.innerText = p.getAttribute('data-name');
                tooltip.style.display = 'block';
                tooltip.style.left = (e.pageX + 15) + 'px';
                tooltip.style.top = (e.pageY + 15) + 'px';
            });
            p.addEventListener('mousemove', (e) => { 
                tooltip.style.left = (e.pageX + 15) + 'px';
                tooltip.style.top = (e.pageY + 15) + 'px';
            });
            p.addEventListener('mouseout', () => { tooltip.style.display = 'none'; });
        });
    }

    // Load saved SFX volume
    const sfx = document.getElementById('hover-sound');
    if (sfx) {
        const savedSFXVolume = localStorage.getItem('sfxVolume');
        sfx.volume = savedSFXVolume ? savedSFXVolume / 100 : 0.5;
    }

    // Set volume slider values from localStorage
    const musicSlider = document.querySelector('input[oninput*="setMusicVolume"]');
    if (musicSlider) {
        const savedMusicVolume = localStorage.getItem('musicVolume');
        musicSlider.value = savedMusicVolume || 30;
    }

    const sfxSlider = document.querySelector('input[oninput*="setSFXVolume"]');
    if (sfxSlider) {
        const savedSFXVolume = localStorage.getItem('sfxVolume');
        sfxSlider.value = savedSFXVolume || 50;
    }

    // Initialize cursor trail effect
    initCursorTrail();
});

// Connection manager

async function initSmartConnection() {
    console.log("🔍 Initializing multiplayer connection...");
    updateConnectionStatus('reconnecting');
    
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isLocalhost) {
        console.log("🏠 Localhost detected, trying WebSocket first...");
        const wsAvailable = await tryWebSocketConnection();
        
        if (wsAvailable) {
            console.log("✅ WebSocket detected");
            connectionMode = CONNECTION_MODE_WS;
            updateConnectionStatus('connected');
            showNotification('WebSocket detected', 'success', 2000);
            
            // If we're on map.html with multiplayer params, rejoin the lobby
            if (myRole && myLobbyCode && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'rejoin', code: myLobbyCode, role: myRole }));
                console.log(`Rejoining lobby ${myLobbyCode} as ${myRole}`);
            }
            return;
        } else {
            console.log("⚠️ WebSocket unavailable, using PHP polling");
        }
    }
    
    console.log("✅ PHP fallback mode no websocket detected");
    connectionMode = CONNECTION_MODE_PHP;
    initPHPPolling();
    showNotification('✨ Multiplayer gatavs!', 'success', 2000);
}

function tryWebSocketConnection() {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            if (ws) {
                ws.close();
            }
            resolve(false);
        }, WS_TIMEOUT);
        
        try {
            const wsUrl = `${WS_PROTOCOL}//${window.location.hostname || 'localhost'}:${WS_PORT}`;
            ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                clearTimeout(timeout);
                setupWebSocketHandlers();
                resolve(true);
            };
            
            ws.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
            
            ws.onclose = () => {
                if (connectionMode === CONNECTION_MODE_WS) {
                    // Only try to reconnect if we were using WebSocket mode
                    console.log("WebSocket disconnected, attempting reconnection...");
                    setTimeout(() => {
                        if (connectionMode === CONNECTION_MODE_WS) {
                            connectWebSocket();
                        }
                    }, 2000);
                }
            };
        } catch (error) {
            clearTimeout(timeout);
            console.error("WebSocket connection failed:", error);
            resolve(false);
        }
    });
}

function setupWebSocketHandlers() {
    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        } catch (e) {
            console.error("Error parsing WebSocket message:", e);
        }
    };
}

function handleWebSocketMessage(data) {
    if (data.type === 'created') {
        myLobbyCode = data.code;
        const lobbyCodeEl = document.getElementById('lobby-code');
        if (lobbyCodeEl) lobbyCodeEl.innerText = myLobbyCode;
        toggleModal('mode-modal');
        setTimeout(() => { toggleModal('lobby-modal'); }, 100);
    }
    else if (data.type === 'guest_joined') {
        // Host receives this when guest joins - show ready prompt
        myRole = 'host';
        const waitEl = document.getElementById('lobby-wait');
        if (waitEl) {
            waitEl.innerHTML = '👥 Spēlētājs pievienojās!<br><button class="btn" id="btn-host-ready" style="margin-top:15px;" onclick="sendLobbyReady()">✅ Esmu gatavs!</button><p id="lobby-ready-status" style="color:#ccc;margin-top:10px;"></p>';
        }
    }
    else if (data.type === 'joined_lobby') {
        // Guest receives this - show ready prompt in lobby modal
        myRole = 'guest';
        myLobbyCode = data.code;
        toggleModal('mode-modal');
        setTimeout(() => {
            toggleModal('lobby-modal');
            const lobbyCodeEl = document.getElementById('lobby-code');
            if (lobbyCodeEl) lobbyCodeEl.innerText = myLobbyCode;
            const waitEl = document.getElementById('lobby-wait');
            if (waitEl) {
                waitEl.innerHTML = '👥 Pievienojies istabai!<br><button class="btn" id="btn-guest-ready" style="margin-top:15px;" onclick="sendLobbyReady()">✅ Esmu gatavs!</button><p id="lobby-ready-status" style="color:#ccc;margin-top:10px;"></p>';
            }
        }, 100);
    }
    else if (data.type === 'player_ready') {
        // Other player is ready
        const statusEl = document.getElementById('lobby-ready-status');
        if (statusEl) statusEl.innerText = '✅ Otrs spēlētājs ir gatavs!';
    }
    else if (data.type === 'start_game') {
        myRole = data.role;
        showNotification(`Spēle sākas! Tava loma: ${myRole}`, 'success');
        setTimeout(() => {
            location.href = `map.html?mode=multi&role=${myRole}&code=${myLobbyCode}&name=${encodeURIComponent(globalName)}`;
        }, 1500);
    }
    else if (data.type === 'rejoined') {
        console.log(`Successfully rejoined lobby as ${data.role}`);
    }
    else if (data.type === 'sync_complete') {
        const statusEl = document.getElementById('partner-status');
        if (statusEl) statusEl.innerText = "Partneris gatavs!";
        setTimeout(() => { showQuiz(currentTask); }, 1000);
    }
    else if (data.type === 'error') {
        showNotification(data.msg, 'error');
    }
    else if (data.type === 'pong') {
        console.log('WebSocket alive');
    }
    else if (data.type === 'player_disconnected') {
        showNotification(data.msg, 'warning');
    }
}

// Legacy WebSocket functions

let wsReconnectAttempts = 0;
const wsMaxReconnectAttempts = 5;
const wsBaseReconnectDelay = 1000;
let wsReconnectTimeout = null;

function connectWebSocket() {
    // Prevent multiple simultaneous connection attempts
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
        return;
    }

    try {
        // Use environment-aware WebSocket URL
        const wsUrl = `${WS_PROTOCOL}//${window.location.hostname || 'localhost'}:${WS_PORT}`;
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log("WebSocket savienots!");
            wsReconnectAttempts = 0; // Reset reconnection counter
            updateConnectionStatus('connected');
        };
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (e) {
                console.error("Error parsing WebSocket message:", e);
            }
        };
        
        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            updateConnectionStatus('error');
        };
        
        ws.onclose = (event) => {
            console.log(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
            updateConnectionStatus('disconnected');
            
            // Attempt reconnection with exponential backoff
            if (wsReconnectAttempts < wsMaxReconnectAttempts) {
                const delay = wsBaseReconnectDelay * Math.pow(2, wsReconnectAttempts);
                wsReconnectAttempts++;
                
                console.log(`Reconnecting in ${delay}ms... (Attempt ${wsReconnectAttempts}/${wsMaxReconnectAttempts})`);
                updateConnectionStatus('reconnecting');
                
                wsReconnectTimeout = setTimeout(() => {
                    connectWebSocket();
                }, delay);
            } else {
                console.log("Max reconnection attempts reached");
                showNotification("Nav iespējams izveidot savienojumu ar serveri. Lūdzu, pārlādējiet lapu.", 'error');
            }
        };
    } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        updateConnectionStatus('error');
    }
}

/**
 * Update connection status indicator
 * @param {string} status - Connection status: 'connected', 'disconnected', 'reconnecting', 'error'
 */
function updateConnectionStatus(status) {
    const indicator = document.getElementById('connection-status');
    if (!indicator) return;
    
    indicator.className = 'connection-status ' + status;
    
    const statusText = {
        'connected': '● Savienots',
        'disconnected': '○ Atvienots',
        'reconnecting': '◐ Atjauno...',
        'error': '⚠ Kļūda'
    };
    
    indicator.textContent = statusText[status] || '';
    indicator.title = statusText[status] || '';
}

// PHP polling alternative

let pollInterval = null;
let phpPolling = false;

function initPHPPolling() {
    console.log("🔄 PHP fallback mode no websocket detected");
    phpPolling = true;
    updateConnectionStatus('connected');
}

function createLobbyPHP() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    
    fetch(`src/php/lobby.php?action=create&code=${code}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                myLobbyCode = data.code;
                const lobbyCodeEl = document.getElementById('lobby-code');
                if (lobbyCodeEl) lobbyCodeEl.innerText = myLobbyCode;
                toggleModal('mode-modal');
                setTimeout(() => { toggleModal('lobby-modal'); }, 100);
                
                // Start polling for guest to join
                startLobbyPolling();
            }
        })
        .catch(error => {
            console.error('Error creating lobby:', error);
            showNotification('Neizdevās izveidot lobby', 'error');
        });
}

function joinLobbyPHP(code) {
    fetch(`src/php/lobby.php?action=join&code=${code}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                myLobbyCode = code;
                myRole = 'guest';
                showNotification('Pievienojies lobby!', 'success');
                setTimeout(() => {
                    location.href = `map.html?mode=multi&role=guest&code=${code}&name=${encodeURIComponent(globalName)}`;
                }, 1500);
            } else {
                showNotification('Lobby nav atrasts vai jau pilns', 'error');
            }
        })
        .catch(error => {
            console.error('Error joining lobby:', error);
            showNotification('Neizdevās pievienoties', 'error');
        });
}

function startLobbyPolling() {
    let pollCount = 0;
    const maxPolls = 60;
    
    pollInterval = setInterval(() => {
        pollCount++;
        
        if (pollCount > maxPolls) {
            clearInterval(pollInterval);
            showNotification('Laiks beidzies, lobby aizvērts', 'error');
            return;
        }
        
        fetch(`src/php/lobby.php?action=check&code=${myLobbyCode}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'ready') {
                    clearInterval(pollInterval);
                    myRole = 'host';
                    showNotification('Spēlētājs pievienojās!', 'success');
                    setTimeout(() => {
                        location.href = `map.html?mode=multi&role=host&code=${myLobbyCode}&name=${encodeURIComponent(globalName)}`;
                    }, 1500);
                }
            })
            .catch(error => console.error('Polling error:', error));
    }, POLL_INTERVAL);
}

/**
 * Notify partner about task completion (PHP version)
 */
function notifyPartnerPHP(role, code) {
    fetch(`src/php/lobby.php?action=update_game&code=${code}&role=${role}`)
        .then(response => response.json())
        .then(() => {
            // Start polling to check if both players are done
            checkBothPlayersDonePHP(code);
        })
        .catch(error => console.error('Error notifying partner:', error));
}

function checkBothPlayersDonePHP(code) {
    const checkInterval = setInterval(() => {
        fetch(`src/php/lobby.php?action=get_state&code=${code}`)
            .then(response => response.json())
            .then(data => {
                if (data.host_done && data.guest_done) {
                    clearInterval(checkInterval);
                    const statusEl = document.getElementById('partner-status');
                    if (statusEl) statusEl.innerText = "Partneris gatavs!";
                    
                    // Reset for next task
                    fetch(`src/php/lobby.php?action=reset_task&code=${code}`)
                        .then(() => {
                            setTimeout(() => { showQuiz(currentTask); }, 1000);
                        });
                }
            })
            .catch(error => console.error('Error checking state:', error));
    }, 1000);
    
    setTimeout(() => clearInterval(checkInterval), 30000);
}

// Menu functions

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    myRole = params.get('role');
    myLobbyCode = params.get('code');
    const nameFromUrl = params.get('name');
    if (nameFromUrl) globalName = decodeURIComponent(nameFromUrl);
}

function validateName() {
    const nameInput = document.getElementById('start-player-name');
    if (!nameInput) return globalName;
    let name = nameInput.value.trim();
    if (!name) { showNotification("Lūdzu ievadi Vārdu!", 'warning'); return null; }
    if (name.length > 8) name = name.substring(0, 8); // Force limit
    return name;
}

function startSingleGame() {
    const name = validateName();
    if (name) location.href = `map.html?name=${encodeURIComponent(name)}`;
}

function openLobby() {
    const name = validateName();
    if (!name) return;
    globalName = name;
    
    if (connectionMode === CONNECTION_MODE_PHP) {
        createLobbyPHP();
    } else if (connectionMode === CONNECTION_MODE_WS && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'create' }));
    } else {
        showNotification("Savienojums nav pieejams! Lūdzu, uzgaidiet...", 'error');
    }
}

function joinGame() {
    const name = validateName(); 
    if (!name) return;
    globalName = name;
    const codeInput = document.getElementById('join-code').value;
    
    if (!codeInput || codeInput.length !== 4) {
        showNotification("Lūdzu, ievadi derīgu 4-ciparu kodu!", 'error');
        return;
    }

    if (connectionMode === CONNECTION_MODE_PHP) {
        joinLobbyPHP(codeInput);
    } else if (connectionMode === CONNECTION_MODE_WS && ws && ws.readyState === WebSocket.OPEN) {
        myLobbyCode = codeInput;
        ws.send(JSON.stringify({ action: 'join', code: codeInput }));
    } else {
        showNotification("Savienojums nav pieejams! Lūdzu, uzgaidiet...", 'error');
    }
}

// Game logic

function updateMapState() {
    const points = document.querySelectorAll('.point');
    const completed = GameState.getCompleted();
    points.forEach(point => {
        const type = point.getAttribute('onclick').match(/'([^']+)'/)[1]; 
        const sequenceIndex = taskSequence.indexOf(type);
        
        point.className = point.className.replace(/\b(active-point|inactive-point)\b/g, "");
        if (sequenceIndex < completed) {
            point.classList.add('inactive-point'); point.style.backgroundColor = "#555"; 
        } else if (sequenceIndex === completed) {
            point.classList.add('active-point'); point.style.pointerEvents = "auto";
        } else {
            point.classList.add('inactive-point');
        }
    });
}

function startActivity(type) {
    if (type !== taskSequence[GameState.getCompleted()]) { showNotification("Lūdzu, izpildi uzdevumus pēc kārtas!", 'warning'); return; }
    currentTask = type;
    
    if (type === 'Osta') showLocationThenStart(type, function() { startBoatGame(); });
    else if (type === 'RTU') showLocationThenStart(type, function() { startAntGame(); });
    else if (type === 'Teatris') showLocationThenStart(type, function() { startHistorySequence(); });
    else if (myRole && myLobbyCode) showLocationThenStart(type, function() { showMiniGame(type); });
    else showLocationThenStart(type, function() { showQuiz(type); });
}

function showLocationThenStart(type, callback) {
    const info = locationInfo[type];
    if (!info) { callback(); return; }
    
    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <div class="location-info">
            <h3>📍 ${info.name}</h3>
            <p>${info.desc}</p>
        </div>
        <button class="btn" id="btn-start-task">Turpināt uz uzdevumu →</button>
    `;
    document.getElementById('btn-start-task').addEventListener('click', function() {
        document.getElementById('game-modal').style.display = 'none';
        callback();
    });
}

// Mini games & quiz

const BOAT_RACE_CONFIG = {
    REQUIRED_PRESSES: 10,
    EXCELLENT_TIME: 3,
    GOOD_TIME: 5,
    SLOW_TIME: 10,
    EXCELLENT_POINTS: 15,
    GOOD_POINTS: 12,
    NORMAL_POINTS: 10,
    SLOW_POINTS: 5
};

let boatRaceActive = false;
let boatStartTime = 0;
let boatSpaceCount = 0;
let boatInterval = null;

function startBoatGame() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const instruction = isTouchDevice 
        ? `Spied pogu ${BOAT_RACE_CONFIG.REQUIRED_PRESSES} reizes pēc iespējas ātrāk!`
        : `Spied SPACE taustiņu ${BOAT_RACE_CONFIG.REQUIRED_PRESSES} reizes pēc iespējas ātrāk!`;
    
    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <h2>Ostas Regate</h2>
        <p>${instruction}</p>
        <h3 id="boat-timer">0.00 s</h3>
        <p id="boat-progress">Spiedienu skaits: 0/${BOAT_RACE_CONFIG.REQUIRED_PRESSES}</p>
        <button class="btn" onclick="initBoatRace()">SĀKT</button>`;
}

function initBoatRace() {
    boatRaceActive = true;
    boatStartTime = Date.now();
    boatSpaceCount = 0;
    
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const actionText = isTouchDevice ? 'SPIED POGU!' : 'SPIED SPACE!';
    
    // Remove any existing listener to prevent duplicates
    document.removeEventListener('keydown', handleBoatKeyPress);
    
    document.querySelector('.task-section').innerHTML = `
        <h2>Ostas Regate</h2>
        <p style="color: #ffaa00; font-size: 24px; font-weight: bold;">${actionText}</p>
        <h3 id="boat-timer">0.00 s</h3>
        <p id="boat-progress" style="font-size: 20px;">Spiedienu skaits: 0/${BOAT_RACE_CONFIG.REQUIRED_PRESSES}</p>
        <button id="boat-tap-btn" class="boat-tap-btn">🚣 SPIED! 🚣</button>`;
    
    // Update timer
    boatInterval = setInterval(() => {
        if (boatRaceActive) {
            const elapsed = ((Date.now() - boatStartTime) / 1000).toFixed(2);
            const timerEl = document.getElementById('boat-timer');
            if (timerEl) timerEl.innerText = elapsed + ' s';
        }
    }, 50);
    
    // Listen for spacebar (desktop)
    document.addEventListener('keydown', handleBoatKeyPress);
    
    // Listen for tap/click on the button (mobile + desktop)
    const tapBtn = document.getElementById('boat-tap-btn');
    if (tapBtn) {
        tapBtn.addEventListener('touchstart', handleBoatTap, { passive: false });
        tapBtn.addEventListener('mousedown', handleBoatTap);
    }
}

function handleBoatTap(e) {
    if (e.cancelable) e.preventDefault();
    if (!boatRaceActive) return;
    registerBoatPress();
}

function handleBoatKeyPress(e) {
    if (!boatRaceActive) return;
    
    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        registerBoatPress();
    }
}

function registerBoatPress() {
    if (!boatRaceActive) return;
    boatSpaceCount++;
    
    const progressEl = document.getElementById('boat-progress');
    if (progressEl) progressEl.innerText = `Spiedienu skaits: ${boatSpaceCount}/${BOAT_RACE_CONFIG.REQUIRED_PRESSES}`;
    
    // Visual feedback on tap button
    const tapBtn = document.getElementById('boat-tap-btn');
    if (tapBtn) {
        tapBtn.style.transform = 'scale(0.9)';
        setTimeout(() => { if (tapBtn) tapBtn.style.transform = 'scale(1)'; }, 100);
    }
    
    if (boatSpaceCount >= BOAT_RACE_CONFIG.REQUIRED_PRESSES) {
        finishBoatRace();
    }
}

function finishBoatRace() {
    boatRaceActive = false;
    clearInterval(boatInterval);
    document.removeEventListener('keydown', handleBoatKeyPress);
    
    const finalTime = ((Date.now() - boatStartTime) / 1000).toFixed(2);
    
    // Award points based on speed using configuration
    let points = BOAT_RACE_CONFIG.NORMAL_POINTS;
    if (finalTime < BOAT_RACE_CONFIG.EXCELLENT_TIME) {
        points = BOAT_RACE_CONFIG.EXCELLENT_POINTS;
    } else if (finalTime < BOAT_RACE_CONFIG.GOOD_TIME) {
        points = BOAT_RACE_CONFIG.GOOD_POINTS;
    } else if (finalTime > BOAT_RACE_CONFIG.SLOW_TIME) {
        points = BOAT_RACE_CONFIG.SLOW_POINTS;
    }
    
    const newScore = GameState.addScore(points);
    
    document.getElementById('score-display').innerText = "Punkti: " + newScore;
    
    document.querySelector('.task-section').innerHTML = `
        <h2>Pabeigts!</h2>
        <p>Tavs laiks: ${finalTime} sekundes</p>
        <p style="color: #ffaa00;">+${points} punkti!</p>
        <button class="btn" onclick="closeBoatGame()">Turpināt</button>`;
}

function closeBoatGame() { 
    boatRaceActive = false;
    if (boatInterval) clearInterval(boatInterval);
    document.removeEventListener('keydown', handleBoatKeyPress);
    document.getElementById('game-modal').style.display = 'none'; 
    GameState.completeTask(); 
    updateMapState(); 
    if(GameState.getCompleted() === 10) showEndGame(); 
}

// RTU Ant (Bug) Mini-Game
let antGameActive = false;
let antsCaught = 0;
let antGameTimer = null;
const ANTS_REQUIRED = 5;
const ANT_GAME_TIME = 15; // seconds

function startAntGame() {
    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <h2>🐜 RTU Bioloģijas uzdevums</h2>
        <p>Nospiez ${ANTS_REQUIRED} skudras ${ANT_GAME_TIME} sekunžu laikā!</p>
        <button class="btn btn-full" onclick="initAntGame()">SĀKT</button>
    `;
}

function initAntGame() {
    antGameActive = true;
    antsCaught = 0;
    let timeLeft = ANT_GAME_TIME;
    
    document.querySelector('.task-section').innerHTML = `
        <h2>🐜 Ķer skudras!</h2>
        <p id="ant-timer" style="color: #ffaa00; font-size: 20px;">Laiks: ${timeLeft}s</p>
        <p id="ant-count" style="font-size: 18px;">Noķertas: 0/${ANTS_REQUIRED}</p>
        <div id="ant-field" style="position: relative; width: 100%; height: 250px; background: rgba(0,100,0,0.2); border: 2px solid #4CAF50; border-radius: 10px; overflow: hidden; cursor: crosshair;"></div>
    `;
    
    antGameTimer = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('ant-timer');
        if (timerEl) timerEl.textContent = `Laiks: ${timeLeft}s`;
        if (timeLeft <= 0) finishAntGame(false);
    }, 1000);
    
    spawnAnt();
}

function spawnAnt() {
    if (!antGameActive) return;
    const field = document.getElementById('ant-field');
    if (!field) return;
    
    const ant = document.createElement('div');
    ant.className = 'game-ant';
    ant.textContent = '🐜';
    ant.style.cssText = `position: absolute; font-size: 28px; cursor: pointer; user-select: none; transition: all 0.3s ease; z-index: 10;`;
    ant.style.left = Math.random() * 85 + '%';
    ant.style.top = Math.random() * 85 + '%';
    
    ant.addEventListener('click', function(e) {
        e.preventDefault();
        if (!antGameActive) return;
        antsCaught++;
        this.textContent = '💥';
        setTimeout(() => { if (this.parentNode) this.parentNode.removeChild(this); }, 200);
        
        const countEl = document.getElementById('ant-count');
        if (countEl) countEl.textContent = `Noķertas: ${antsCaught}/${ANTS_REQUIRED}`;
        
        if (antsCaught >= ANTS_REQUIRED) { finishAntGame(true); }
        else { setTimeout(spawnAnt, 300); }
    });
    
    field.appendChild(ant);
    
    // Move the ant around
    const moveAnt = setInterval(() => {
        if (!antGameActive || !ant.parentNode) { clearInterval(moveAnt); return; }
        ant.style.left = Math.random() * 85 + '%';
        ant.style.top = Math.random() * 85 + '%';
    }, 800);
    
    // Spawn additional ants for difficulty (only if game still active)
    if (antsCaught > 2 && antGameActive) setTimeout(() => { if (antGameActive) spawnAnt(); }, 2000);
}

function finishAntGame(success) {
    antGameActive = false;
    if (antGameTimer) clearInterval(antGameTimer);
    
    const points = success ? 10 : -5;
    GameState.addScore(points);
    document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
    
    const guideHint = document.getElementById('guide-hint');
    if (guideHint) guideHint.textContent = getRandomBubble(success);
    
    document.querySelector('.task-section').innerHTML = `
        <h2>${success ? '✅ Lielisks darbs!' : '❌ Laiks beidzies!'}</h2>
        <p>Noķertas skudras: ${antsCaught}/${ANTS_REQUIRED}</p>
        <p style="color: ${success ? '#4CAF50' : '#f44336'};">${points > 0 ? '+' : ''}${points} punkti</p>
        <p style="color: #ffaa00; font-style: italic;">${questions['RTU'].fact}</p>
        <button class="btn btn-full" onclick="closeAntGame()">Turpināt →</button>
    `;
}

function closeAntGame() {
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask();
    updateMapState();
    if (GameState.getCompleted() === 10) showEndGame();
}

// Historical Sequence Mini-Game (Teatris location)
const historyEvents = [
    { year: 1625, text: "Liepāja iegūst pilsētas tiesības" },
    { year: 1907, text: "Dibināts Liepājas Teātris" },
    { year: 2015, text: "Atklāta koncertzāle 'Lielais Dzintars'" }
];

function startHistorySequence() {
    document.getElementById('game-modal').style.display = 'block';
    
    const shuffled = [...historyEvents].sort(() => Math.random() - 0.5);
    
    document.querySelector('.task-section').innerHTML = `
        <h2>📜 Vēsturiskā secība</h2>
        <p>Sakārto notikumus hronoloģiskā secībā (no senākā uz jaunāko)!</p>
        <div id="history-slots" style="display: flex; flex-direction: column; gap: 10px; margin: 15px 0;">
            ${shuffled.map((ev, i) => `
                <div class="history-item" draggable="true" data-year="${ev.year}" 
                     style="background: rgba(0,0,0,0.3); border: 2px solid #ffaa00; border-radius: 8px; padding: 12px; cursor: grab; user-select: none; display: flex; align-items: center; gap: 10px;">
                    <span style="color: #ffaa00; font-weight: bold; font-size: 18px;">${i + 1}.</span>
                    <span>${ev.text}</span>
                </div>
            `).join('')}
        </div>
        <p style="font-size: 12px; color: #aaa;">💡 Spied uz notikumiem lai pārvietotu augšup</p>
        <button class="btn btn-full" onclick="checkHistorySequence()">Iesniegt secību</button>
    `;
    
    // Add click-to-reorder functionality
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', function() {
            const container = document.getElementById('history-slots');
            const items = Array.from(container.querySelectorAll('.history-item'));
            const idx = items.indexOf(this);
            if (idx > 0) {
                container.insertBefore(this, items[idx - 1]);
                // Update numbering
                container.querySelectorAll('.history-item').forEach((el, i) => {
                    el.querySelector('span').textContent = (i + 1) + '.';
                });
            }
        });
    });
}

function checkHistorySequence() {
    const items = document.querySelectorAll('.history-item');
    const years = Array.from(items).map(item => parseInt(item.getAttribute('data-year')));
    const isCorrect = years.every((year, i) => i === 0 || year >= years[i - 1]);
    
    const points = isCorrect ? 10 : -5;
    GameState.addScore(points);
    document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
    
    const guideHint = document.getElementById('guide-hint');
    if (guideHint) guideHint.textContent = getRandomBubble(isCorrect);
    
    const correctOrder = [...historyEvents].sort((a, b) => a.year - b.year);
    document.querySelector('.task-section').innerHTML = `
        <h2>${isCorrect ? '✅ Pareizi!' : '❌ Nepareizi!'}</h2>
        <p>Pareizā secība:</p>
        <ol style="margin: 10px 0; padding-left: 20px;">
            ${correctOrder.map(ev => `<li>${ev.year}. g. — ${ev.text}</li>`).join('')}
        </ol>
        <p style="color: ${isCorrect ? '#4CAF50' : '#f44336'};">${points > 0 ? '+' : ''}${points} punkti</p>
        <p style="color: #ffaa00; font-style: italic;">${questions['Teatris'].fact}</p>
        <button class="btn btn-full" onclick="closeHistoryGame()">Turpināt →</button>
    `;
}

function closeHistoryGame() {
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask();
    updateMapState();
    if (GameState.getCompleted() === 10) showEndGame();
}


function showMiniGame(type) {
    document.getElementById('game-modal').style.display = "block";
    const content = document.querySelector('.task-section');
    
    if (type === 'Cietums') {
        const code = myRole === 'host' ? "4 2 _ _" : "_ _ 9 1";
        content.innerHTML = `<h2>Cietums</h2><p>Kods: ${code}</p>
            <div class="quiz-form">
                <input id="mini-input" placeholder="Ievadi kodu...">
                <button class="btn btn-full" onclick="checkMini()">OK</button>
            </div>`;
    } else {
        content.innerHTML = `<h2>Gatavs?</h2><button class="btn btn-full" onclick="sendReady()">JĀ</button><p id="partner-status" style="display:none">Gaidu...</p>`;
    }
}

const _miniCode = _e('4291');

function checkMini() {
    if(document.getElementById('mini-input').value === _d(_miniCode)) sendReady();
}

function sendLobbyReady() {
    if (connectionMode === CONNECTION_MODE_WS && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'ready', code: myLobbyCode, role: myRole }));
        const statusEl = document.getElementById('lobby-ready-status');
        if (statusEl) statusEl.innerText = '⏳ Gaidu otru spēlētāju...';
        const readyBtn = document.getElementById('btn-host-ready') || document.getElementById('btn-guest-ready');
        if (readyBtn) readyBtn.disabled = true;
    }
}

function sendReady() {
    // Handle both WebSocket and PHP polling modes
    if (connectionMode === CONNECTION_MODE_WS && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'update_task', code: myLobbyCode, role: myRole }));
        document.querySelector('.task-section').innerHTML = "<h2>Gaidam otru...</h2>";
    } else if (connectionMode === CONNECTION_MODE_PHP) {
        notifyPartnerPHP(myRole, myLobbyCode);
        document.querySelector('.task-section').innerHTML = "<h2>Gaidam otru...</h2>";
    } else {
        // Connection not available
        showNotification("Savienojums nav pieejams!", 'error');
        console.error("sendReady failed: No valid connection mode available");
    }
}

async function showQuiz(type) {
    document.getElementById('game-modal').style.display = "block";
    const task = questions[type];
    
    let q = task.q;

    document.querySelector('.task-section').innerHTML = `
        <h2>${type}</h2><p>${q}</p>
        <div class="quiz-form">
            <input id="ans-in" placeholder="Tava atbilde..." maxlength="50">
            <button class="btn btn-full" onclick="checkAns('${type}')">Iesniegt</button>
        </div>
    `;
}

/**
 * Enforce score limits (minimum 0, maximum 100)
 */
function enforceScoreLimits() {
    // Now handled by GameState internally
}

function checkAns(type) {
    const val = document.getElementById('ans-in').value;
    const correct = _d(questions[type]._a);
    const isCorrect = val.toLowerCase() === correct.toLowerCase();
    
    if(isCorrect) {
        GameState.addScore(10);
        showNotification('✅ Pareiza atbilde! +10 punkti', 'success', 2000);
    } else {
        GameState.addScore(-5);
        showNotification('❌ Nepareiza atbilde! -5 punkti', 'error', 2000);
    }
    
    // Update guide bubble with dynamic comment
    const guideHint = document.getElementById('guide-hint');
    if (guideHint) guideHint.textContent = getRandomBubble(isCorrect);
    
    document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
    
    // Show fact before closing
    document.querySelector('.task-section').innerHTML = `
        <h2>${type}</h2>
        <p style="color: ${isCorrect ? '#4CAF50' : '#f44336'}; font-size: 18px;">${isCorrect ? '✅ Pareizi!' : '❌ Nepareizi!'}</p>
        <p><strong>Atbilde:</strong> ${correct}</p>
        <p style="color: #ffaa00; font-style: italic;">${questions[type].fact}</p>
        <button class="btn btn-full" onclick="closeQuizAndContinue()">Turpināt →</button>
    `;
}

function closeQuizAndContinue() {
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask();
    updateMapState();
    if(GameState.getCompleted() === 10) showEndGame();
}

function showEndGame() { 
    // Calculate elapsed time
    const endTime = Date.now();
    const elapsedSeconds = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const finalScore = GameState.getScore();
    
    // Show end game screen instead of immediately redirecting
    showEndGameScreen(finalScore, formattedTime);
}

// End Game screen with congratulations, score, time and navigation
function showEndGameScreen(finalScore, formattedTime) {
    document.getElementById('game-modal').style.display = 'block';
    
    let medal = '🥉';
    if (finalScore >= 80) medal = '🥇';
    else if (finalScore >= 50) medal = '🥈';
    
    document.querySelector('.task-section').innerHTML = `
        <div style="text-align: center;">
            <h2 style="color: #ffaa00; font-size: 28px;">${medal} Apsveicam! ${medal}</h2>
            <p style="font-size: 18px;">Tu esi pabeidzis ekskursiju pa Liepāju!</p>
            <div style="background: rgba(0,0,0,0.3); border: 2px solid #ffaa00; border-radius: 12px; padding: 20px; margin: 15px 0;">
                <p style="font-size: 22px; color: #ffaa00; margin: 5px 0;">🏆 Punkti: <strong>${finalScore}</strong>/100</p>
                <p style="font-size: 22px; color: #ffaa00; margin: 5px 0;">⏱ Laiks: <strong>${formattedTime}</strong></p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                <button class="btn btn-full" id="btn-save-score">🏆 Saglabāt un skatīt TOP 10</button>
                <button class="btn btn-full" id="btn-back-menu">🔙 Atpakaļ uz menu</button>
                <button class="btn btn-full" id="btn-play-again">🔄 Spēlēt vēlreiz</button>
            </div>
        </div>
    `;
    
    // Attach event listeners safely instead of inline onclick
    document.getElementById('btn-save-score').addEventListener('click', function() {
        finishGame(globalName, finalScore, formattedTime);
    });
    document.getElementById('btn-back-menu').addEventListener('click', function() {
        location.href = 'index.html';
    });
    document.getElementById('btn-play-again').addEventListener('click', function() {
        location.href = 'map.html?name=' + encodeURIComponent(globalName);
    });
}

// Guide character dynamic text bubbles
const guideBubbles = {
    correct: [
        "Lielisks darbs! Tu esi īsts Liepājas eksperts! 🎉",
        "Pareizi! Tu zini Liepāju kā savu kabatu! 🗺️",
        "Bravo! Tā turpini! 💪",
        "Izcili! Tu esi pelnījis aplausus! 👏",
        "Super! Nākamais izaicinājums gaida! 🌟"
    ],
    wrong: [
        "Hmm, tā nav pareizā atbilde... Mēģini vēlreiz nākamreiz! 🤔",
        "Nekas, arī kļūdīties ir cilvēcīgi! 😅",
        "Ak, gandrīz! Bet nepadodies! 💭",
        "Tā nebija... Bet galvenais ir mācīties! 📚",
        "Ups! Nākamreiz noteikti sanāks! 🍀"
    ]
};

function getRandomBubble(isCorrect) {
    const arr = isCorrect ? guideBubbles.correct : guideBubbles.wrong;
    return arr[Math.floor(Math.random() * arr.length)];
}

function finishGame(name, finalScore, time) { 
    // Save score to database
    const formData = new FormData();
    formData.append('name', name);
    formData.append('score', finalScore);
    formData.append('time', time);
    
    fetch('src/php/save_score.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(data => {
        console.log('Score saved:', data);
        // Redirect to leaderboard
        location.href = 'src/php/leaderboard.php';
    })
    .catch(error => {
        console.error('Error saving score:', error);
        // Still redirect even if save fails
        location.href = 'src/php/leaderboard.php';
    });
}

function exitGame() { window.close(); }
function setMusicVolume(v) { 
    localStorage.setItem('musicVolume', v);
}
function setSFXVolume(v) { 
    const sfx = document.getElementById('hover-sound');
    if (sfx) {
        sfx.volume = v/100;
        localStorage.setItem('sfxVolume', v);
    }
}

// Cursor trail effect
function getTrailColor() {
    const theme = document.body.getAttribute('data-theme') || 'default';
    const colors = {
        'default': 'rgba(255, 170, 0,',
        'dark': 'rgba(0, 170, 255,',
        'light': 'rgba(255, 102, 0,',
        'blue': 'rgba(255, 215, 0,'
    };
    return colors[theme] || colors['default'];
}

function initCursorTrail() {
    const canvas = document.getElementById('cursor-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let mouseMoved = false;
    const pointer = {
        x: 0.5 * window.innerWidth,
        y: 0.5 * window.innerHeight,
    };
    const params = {
        pointsNumber: 40,
        widthFactor: 0.3,
        spring: 0.4,
        friction: 0.5
    };

    const trail = new Array(params.pointsNumber);
    for (let i = 0; i < params.pointsNumber; i++) {
        trail[i] = { x: pointer.x, y: pointer.y, dx: 0, dy: 0 };
    }

    function updateMousePosition(eX, eY) {
        pointer.x = eX;
        pointer.y = eY;
    }

    window.addEventListener("click", e => { updateMousePosition(e.pageX, e.pageY); });
    window.addEventListener("mousemove", e => {
        mouseMoved = true;
        updateMousePosition(e.pageX, e.pageY);
    });
    window.addEventListener("touchmove", e => {
        mouseMoved = true;
        updateMousePosition(e.targetTouches[0].pageX, e.targetTouches[0].pageY);
    });

    function setupCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    setupCanvas();
    window.addEventListener("resize", setupCanvas);

    function update(t) {
        if (!mouseMoved) {
            pointer.x = (0.5 + 0.3 * Math.cos(0.002 * t) * Math.sin(0.005 * t)) * window.innerWidth;
            pointer.y = (0.5 + 0.2 * Math.cos(0.005 * t) + 0.1 * Math.cos(0.01 * t)) * window.innerHeight;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        trail.forEach((p, pIdx) => {
            const prev = pIdx === 0 ? pointer : trail[pIdx - 1];
            const spring = pIdx === 0 ? 0.4 * params.spring : params.spring;
            p.dx += (prev.x - p.x) * spring;
            p.dy += (prev.y - p.y) * spring;
            p.dx *= params.friction;
            p.dy *= params.friction;
            p.x += p.dx;
            p.y += p.dy;
        });

        const colorBase = getTrailColor();
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(trail[0].x, trail[0].y);

        for (let i = 1; i < trail.length - 1; i++) {
            const xc = 0.5 * (trail[i].x + trail[i + 1].x);
            const yc = 0.5 * (trail[i].y + trail[i + 1].y);
            ctx.quadraticCurveTo(trail[i].x, trail[i].y, xc, yc);
            ctx.lineWidth = params.widthFactor * (params.pointsNumber - i);
            const alpha = 1 - (i / trail.length);
            ctx.strokeStyle = colorBase + ' ' + alpha.toFixed(2) + ')';
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(xc, yc);
        }
        ctx.lineTo(trail[trail.length - 1].x, trail[trail.length - 1].y);
        ctx.stroke();

        window.requestAnimationFrame(update);
    }

    window.requestAnimationFrame(update);
}

// Theme system
function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('theme', themeName);
    
    // Update active button
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === themeName) {
            btn.classList.add('active');
        }
    });
    
    showNotification(`Tēma mainīta: ${getThemeLabel(themeName)}`, 'success', 2000);
}

function getThemeLabel(themeName) {
    const labels = {
        'default': 'Noklusējuma',
        'dark': 'Tumša',
        'light': 'Gaiša',
        'blue': 'Zila'
    };
    return labels[themeName] || themeName;
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'default';
    document.body.setAttribute('data-theme', savedTheme);
    updateActiveThemeButton(savedTheme);
}

function updateActiveThemeButton(savedTheme) {
    const buttons = document.querySelectorAll('.theme-btn');
    if (buttons.length === 0) {
        // Settings modal not yet loaded, try again when it opens
        return;
    }
    
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === savedTheme) {
            btn.classList.add('active');
        }
    });
}

function toggleModal(id) {
    const modal = document.getElementById(id);
    const isOpening = modal.style.display !== "block";
    modal.style.display = isOpening ? "block" : "none";
    
    // Update theme button active state when settings modal opens
    if (isOpening && id === 'settings-modal') {
        const savedTheme = localStorage.getItem('theme') || 'default';
        updateActiveThemeButton(savedTheme);
    }
}

// Spotify mini player

let spotifyEmbedController = null;
let spotifyIsPlaying = false;
let spotifyShuffleOn = false;
let spotifyRepeatOn = false;
let spotifyLoaded = false;

/**
 * Initialize the Spotify Embed iframe and IFrame API controller.
 * On first call it inserts a hidden iframe and connects via the
 * Spotify IFrame API so we can drive playback with JS.
 */
function spotifyInit(callback) {
    if (spotifyLoaded) { if (callback) callback(); return; }
    const container = document.getElementById('spotify-embed-container');
    if (!container) return;
    
    const playlistId = SPOTIFY_PLAYLIST_URL.split('/').pop().split('?')[0];
    container.style.display = 'block';
    container.innerHTML = `<iframe 
        id="spotify-iframe"
        src="https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0" 
        width="1" 
        height="1" 
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
        loading="lazy"
        style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;border:0;">
    </iframe>`;
    
    // Try connecting to the Spotify IFrame API
    window.onSpotifyIframeApiReady = function(IFrameAPI) {
        const iframe = document.getElementById('spotify-iframe');
        if (!iframe) return;
        IFrameAPI.createController(iframe, {}, function(controller) {
            spotifyEmbedController = controller;
            controller.addListener('playback_update', function(e) {
                spotifyIsPlaying = !e.data.isPaused;
                updatePlayButton();
            });
            if (callback) callback();
        });
    };
    
    // Load the Spotify IFrame API script if not already present
    if (!document.getElementById('spotify-iframe-api')) {
        const script = document.createElement('script');
        script.id = 'spotify-iframe-api';
        script.src = 'https://open.spotify.com/embed/iframe-api/v1';
        document.head.appendChild(script);
    }
    spotifyLoaded = true;
}

function updatePlayButton() {
    const btn = document.getElementById('smp-play');
    if (btn) btn.textContent = spotifyIsPlaying ? '⏸️' : '▶️';
}

function spotifyPlayPause() {
    if (!spotifyLoaded) {
        spotifyInit(function() {
            if (spotifyEmbedController) spotifyEmbedController.togglePlay();
        });
        // Update UI optimistically
        spotifyIsPlaying = true;
        updatePlayButton();
        const name = document.getElementById('smp-artist-name');
        if (name) name.textContent = 'Ielādē...';
        return;
    }
    if (spotifyEmbedController) {
        spotifyEmbedController.togglePlay();
    }
}

function spotifyNext() {
    if (!spotifyLoaded) { spotifyInit(); return; }
    // Spotify Embed IFrame API has limited skip support.
    // We restart the playlist which triggers the next track if shuffle is on in the player.
    if (spotifyEmbedController) {
        const playlistUri = SPOTIFY_PLAYLIST_URL.replace('https://open.spotify.com/', 'spotify:').replace(/\//g, ':');
        spotifyEmbedController.loadUri(playlistUri);
        spotifyEmbedController.play();
    }
    showNotification('⏭ Nākamā dziesma', 'info', 1500);
}

function spotifyPrev() {
    if (!spotifyLoaded) { spotifyInit(); return; }
    // Seek to start of current track (standard prev behavior)
    if (spotifyEmbedController) {
        spotifyEmbedController.seek(0);
    }
    showNotification('⏮ No sākuma', 'info', 1500);
}

function spotifyToggleShuffle() {
    // Note: Spotify Embed IFrame API does not expose shuffle control directly.
    // This toggles the UI state; actual shuffle depends on the user's Spotify app settings.
    spotifyShuffleOn = !spotifyShuffleOn;
    const btn = document.getElementById('smp-shuffle');
    if (btn) {
        btn.classList.toggle('active', spotifyShuffleOn);
    }
    showNotification(spotifyShuffleOn ? '🔀 Shuffle ON' : '🔀 Shuffle OFF', 'info', 1500);
}

function spotifyToggleRepeat() {
    // Note: Spotify Embed IFrame API does not expose repeat control directly.
    // This toggles the UI state; actual repeat depends on the user's Spotify app settings.
    spotifyRepeatOn = !spotifyRepeatOn;
    const btn = document.getElementById('smp-repeat');
    if (btn) {
        btn.classList.toggle('active', spotifyRepeatOn);
    }
    showNotification(spotifyRepeatOn ? '🔁 Repeat ON' : '🔁 Repeat OFF', 'info', 1500);
}

// Notification system

function showNotification(message, type = 'info', duration = 3000) {
    // Create notification container if it doesn't exist
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add icon based on type
    const icon = {
        'success': '✓',
        'error': '✗',
        'warning': '⚠',
        'info': 'ℹ'
    }[type] || 'ℹ';
    
    notification.innerHTML = `<span class="notification-icon">${icon}</span><span class="notification-text">${message}</span>`;
    
    // Add to container
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Remove after duration
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, duration);
}

// Expose only UI-triggered functions to window (for onclick handlers in HTML)
// Game state internals (GameState, _d, _e, _xk, questions answers) remain private
window.toggleModal = toggleModal;
window.startSingleGame = startSingleGame;
window.openLobby = openLobby;
window.joinGame = joinGame;
window.exitGame = exitGame;
window.setMusicVolume = setMusicVolume;
window.setSFXVolume = setSFXVolume;
window.setTheme = setTheme;
window.startActivity = startActivity;
window.checkAns = checkAns;
window.closeQuizAndContinue = closeQuizAndContinue;
window.initBoatRace = initBoatRace;
window.closeBoatGame = closeBoatGame;
window.initAntGame = initAntGame;
window.closeAntGame = closeAntGame;
window.checkHistorySequence = checkHistorySequence;
window.closeHistoryGame = closeHistoryGame;
window.sendReady = sendReady;
window.sendLobbyReady = sendLobbyReady;
window.checkMini = checkMini;
window.finishGame = finishGame;
window.showEndGameScreen = showEndGameScreen;
window.spotifyPlayPause = spotifyPlayPause;
window.spotifyNext = spotifyNext;
window.spotifyPrev = spotifyPrev;
window.spotifyToggleShuffle = spotifyToggleShuffle;
window.spotifyToggleRepeat = spotifyToggleRepeat;

})(); // End IIFE