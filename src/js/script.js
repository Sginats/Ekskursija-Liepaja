// ============================================================================
// LIEPĀJAS EKSKURSIJA - GAME LOGIC
// ============================================================================
// Main game script handling map interactions, WebSocket connections,
// quiz system, and user interface management.
// ============================================================================

// --- GLOBAL STATE MANAGEMENT ---
let score = 0;
let currentTask = "";
let completedTasks = 0;
let currentCorrectAnswer = ""; 
let currentLang = localStorage.getItem('lang') || 'lv';
let startTime; 
let myRole = '';
let myLobbyCode = '';
let globalName = "Anonīms";
let ws = null;

// --- SPOTIFY CONFIGURATION ---
// TODO: Update this with your actual Spotify playlist URL
// Format: https://open.spotify.com/playlist/YOUR_PLAYLIST_ID
const SPOTIFY_PLAYLIST_URL = 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M';

// --- CONFIGURATION ---
const WS_PORT = 8080;
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const POLL_INTERVAL = 2000; // Poll every 2 seconds
const WS_TIMEOUT = 2000; // WebSocket connection timeout (short since it's unlikely to work)

// Connection mode constants
const CONNECTION_MODE_PHP = 'php-polling';
const CONNECTION_MODE_WS = 'websocket';
let connectionMode = CONNECTION_MODE_PHP; // Default to PHP polling (works everywhere)

// Task completion sequence - defines the order in which locations must be visited
const taskSequence = [
    'RTU', 'Dzintars', 'Teatris', 'Kanals', 'Osta', 
    'LSEZ', 'Cietums', 'Mols', 'Ezerkrasts', 'Parks'
];

// Question database with answers and interesting facts
const questions = {
    'RTU': { q: "Kurā gadā dibināta Liepājas akadēmija?", a: "1954", fact: "Šeit mācās gudrākie prāti!" },
    'Mols': { q: "Cik metrus garš ir Ziemeļu mols?", a: "1800", fact: "Turi cepuri! Mols sargā ostu." },
    'Cietums': { q: "Kā sauc Karostas tūrisma cietumu?", a: "Karostas cietums", fact: "Vienīgais militārais cietums atvērts tūristiem!" },
    'Dzintars': { q: "Kā sauc Liepājas koncertzāli?", a: "Lielais Dzintars", fact: "Izskatās pēc milzīga dzintara!" },
    'Teatris': { q: "Kurā gadā dibināts Liepājas Teātris?", a: "1907", fact: "Vecākais profesionālais teātris Latvijā!" },
    'Kanals': { q: "Kā sauc kanālu starp ezeru un jūru?", a: "Tirdzniecības", fact: "Savieno ezeru ar jūru." },
    'Osta': { q: "Kā sauc Liepājas speciālo zonu?", a: "LSEZ", fact: "Osta šeit neaizsalst." },
    'Parks': { q: "Kā sauc parku pie jūras?", a: "Jūrmalas", fact: "Viens no lielākajiem parkiem Latvijā!" },
    'LSEZ': { q: "Vai UPB ir Liepājas uzņēmums (Jā/Nē)?", a: "Jā", fact: "Būvē ēkas visā pasaulē!" },
    'Ezerkrasts': { q: "Kāda ezera krastā ir taka?", a: "Liepājas", fact: "Piektais lielākais ezers Latvijā." }
};

// UI text translations (Latvian base)
const uiTexts = {
    "main-title": "LIEPĀJAS KARTE",
    "subtitle": "EKSKURSIJA",
    "btn-start": "Sākt spēli",
    "btn-settings": "Iestatījumi",
    "btn-leaderboard": "Top 10",
    "btn-about": "Par spēli",
    "btn-exit": "Iziet",
    "score-label": "Punkti: ",
    "btn-submit": "Iesniegt",
    "mode-title": "Izvēlies režīmu",
    "btn-single": "Spēlēt vienam",
    "btn-lobby": "Spēlēt ar draugu",
    "btn-join": "Pievienoties",
    "btn-cancel-mode": "Atcelt"
};

// ============================================================================
// INITIALIZATION & EVENT LISTENERS
// ============================================================================

/**
 * Main initialization function - runs when DOM is fully loaded
 * Sets up WebSocket connection, tooltips, audio, and translations
 */
document.addEventListener('DOMContentLoaded', () => {
    // Parse URL parameters for multiplayer mode
    getQueryParams();
    startTime = Date.now();
    
    // Only connect WebSocket if on index.html (for lobby creation/joining)
    // or if we have multiplayer parameters (role and code)
    const pathname = window.location.pathname;
    const needsConnection = (pathname.endsWith('index.html') || pathname === '/' || pathname.endsWith('/')) || 
                          (myRole && myLobbyCode);
    
    if (needsConnection) {
        // Show connection status indicator on pages that use multiplayer
        const statusIndicator = document.getElementById('connection-status');
        if (statusIndicator) {
            statusIndicator.style.display = 'block';
        }
        
        // Smart connection: Try WebSocket first, fallback to PHP polling
        initSmartConnection();
    }

    // Language switching disabled - using Latvian only
    // Spotify player integration replaces language switcher
    
    // Initialize map point states if on map page
    if(document.querySelector('.point')) updateMapState();

    // Setup tooltip system for map points
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

    // Initialize background music with user interaction requirement
    const music = document.getElementById('bg-music');
    if (music) {
        // Load saved volume or use default
        const savedMusicVolume = localStorage.getItem('musicVolume');
        music.volume = savedMusicVolume ? savedMusicVolume / 100 : 0.3;
        const playAudio = () => {
            music.play().catch(() => {});
            document.removeEventListener('click', playAudio);
        };
        document.addEventListener('click', playAudio);
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
});

// --- 3. SMART CONNECTION MANAGER (MODERN HYBRID APPROACH) ---

/**
 * Smart connection initialization
 * Uses PHP polling by default (works on any hosting)
 * Only tries WebSocket if on localhost (for development)
 */
async function initSmartConnection() {
    console.log("🔍 Initializing multiplayer connection...");
    updateConnectionStatus('reconnecting');
    
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    // Only try WebSocket on localhost
    if (isLocalhost) {
        console.log("🏠 Localhost detected, trying WebSocket first...");
        const wsAvailable = await tryWebSocketConnection();
        
        if (wsAvailable) {
            console.log("✅ Using WebSocket mode (real-time, fastest)");
            connectionMode = CONNECTION_MODE_WS;
            updateConnectionStatus('connected');
            showNotification('🚀 WebSocket Režīms (Dev)', 'success', 2000);
            return;
        } else {
            console.log("⚠️ WebSocket unavailable, using PHP polling");
        }
    }
    
    // Use PHP polling (default for production)
    console.log("✅ Using PHP polling mode (works everywhere)");
    connectionMode = CONNECTION_MODE_PHP;
    initPHPPolling();
    showNotification('✨ Multiplayer gatavs!', 'success', 2000);
}

/**
 * Try to establish WebSocket connection with timeout
 * Returns true if successful, false otherwise
 */
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

/**
 * Setup WebSocket event handlers
 */
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

/**
 * Handle WebSocket messages
 */
function handleWebSocketMessage(data) {
    if (data.type === 'created') {
        myLobbyCode = data.code;
        const lobbyCodeEl = document.getElementById('lobby-code');
        if (lobbyCodeEl) lobbyCodeEl.innerText = myLobbyCode;
        toggleModal('mode-modal');
        setTimeout(() => { toggleModal('lobby-modal'); }, 100);
    }
    else if (data.type === 'start_game') {
        myRole = data.role;
        showNotification(`Spēle sākas! Tava loma: ${myRole}`, 'success');
        setTimeout(() => {
            location.href = `map.html?mode=multi&role=${myRole}&code=${myLobbyCode}&name=${encodeURIComponent(globalName)}`;
        }, 1500);
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
        // Heartbeat response
        console.log('WebSocket alive');
    }
}

// --- LEGACY WEBSOCKET FUNCTIONS (KEPT FOR COMPATIBILITY) ---

let wsReconnectAttempts = 0;
const wsMaxReconnectAttempts = 5;
const wsBaseReconnectDelay = 1000;
let wsReconnectTimeout = null;

/**
 * Connect to WebSocket server with automatic reconnection
 * Uses exponential backoff for reconnection attempts
 */
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
                
                if (data.type === 'created') {
                    myLobbyCode = data.code;
                    const lobbyCodeEl = document.getElementById('lobby-code');
                    if (lobbyCodeEl) lobbyCodeEl.innerText = myLobbyCode;
                    toggleModal('mode-modal');
                    setTimeout(() => { toggleModal('lobby-modal'); }, 100);
                }
                else if (data.type === 'start_game') {
                    myRole = data.role;
                    showNotification(`Spēle sākas! Tava loma: ${myRole}`, 'success');
                    setTimeout(() => {
                        location.href = `map.html?mode=multi&role=${myRole}&code=${myLobbyCode}&name=${encodeURIComponent(globalName)}`;
                    }, 1500);
                }
                else if (data.type === 'sync_complete') {
                    const statusEl = document.getElementById('partner-status');
                    if (statusEl) statusEl.innerText = "Partneris gatavs!";
                    setTimeout(() => { showQuiz(currentTask); }, 1000);
                }
                else if (data.type === 'error') {
                    showNotification(data.msg, 'error');
                }
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

// --- PHP POLLING ALTERNATIVE (NO NODE.JS REQUIRED) ---

let pollInterval = null;
let phpPolling = false;

/**
 * Initialize PHP-based polling system (alternative to WebSockets)
 * This allows multiplayer to work with only PHP server running
 */
function initPHPPolling() {
    console.log("🔄 Using PHP polling mode (no WebSocket server required)");
    phpPolling = true;
    updateConnectionStatus('connected');
}

/**
 * Create lobby using PHP
 */
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

/**
 * Join lobby using PHP
 */
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

/**
 * Poll lobby status waiting for guest
 */
function startLobbyPolling() {
    let pollCount = 0;
    const maxPolls = 60; // Poll for 2 minutes max
    
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

/**
 * Check if both players completed task (PHP version)
 */
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
    
    // Stop checking after 30 seconds
    setTimeout(() => clearInterval(checkInterval), 30000);
}

// --- 4. DEEPL TULKOŠANA ---

async function translateText(text, targetLang) {
    try {
        const response = await fetch(`../php/translate.php?text=${encodeURIComponent(text)}&target=${targetLang}`);
        const data = await response.json();
        if (data && data.translations && data.translations[0]) {
            return data.translations[0].text;
        }
    } catch (e) {
        console.error("Tulkošanas kļūda:", e);
    }
    return text;
}

async function translateInterface(lang) {
    // Tulko UI elementus
    for (const key in uiTexts) {
        const el = document.getElementById(key);
        if (el) {
            const original = uiTexts[key];
            const translated = await translateText(original, lang.toUpperCase());
            if (el.tagName === 'INPUT') el.placeholder = translated;
            else el.innerText = translated;
        }
    }
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    location.reload(); // Pārlādējam, lai ielādētos tulkojumi
}

// --- 5. MENU FUNKCIJAS ---

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

// --- 6. SPĒLES LOĢIKA ---

function updateMapState() {
    const points = document.querySelectorAll('.point');
    points.forEach(point => {
        const type = point.getAttribute('onclick').match(/'([^']+)'/)[1]; 
        const sequenceIndex = taskSequence.indexOf(type);
        
        point.className = point.className.replace(/\b(active-point|inactive-point)\b/g, "");
        if (sequenceIndex < completedTasks) {
            point.classList.add('inactive-point'); point.style.backgroundColor = "#555"; 
        } else if (sequenceIndex === completedTasks) {
            point.classList.add('active-point'); point.style.pointerEvents = "auto";
        } else {
            point.classList.add('inactive-point');
        }
    });
}

function startActivity(type) {
    if (type !== taskSequence[completedTasks]) { showNotification("Lūdzu, izpildi uzdevumus pēc kārtas!", 'warning'); return; }
    currentTask = type;
    
    if (type === 'Osta') startBoatGame();
    else if (myRole && myLobbyCode) showMiniGame(type); 
    else showQuiz(type);
}

// --- 7. MINI SPĒLES & QUIZ ---

// Boat race game configuration
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
    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <h2>Ostas Regate</h2>
        <p>Spied SPACE taustiņu ${BOAT_RACE_CONFIG.REQUIRED_PRESSES} reizes pēc iespējas ātrāk!</p>
        <h3 id="boat-timer">0.00 s</h3>
        <p id="boat-progress">Spiedienu skaits: 0/${BOAT_RACE_CONFIG.REQUIRED_PRESSES}</p>
        <button class="btn" onclick="initBoatRace()">SĀKT</button>`;
}

function initBoatRace() {
    boatRaceActive = true;
    boatStartTime = Date.now();
    boatSpaceCount = 0;
    
    // Remove any existing listener to prevent duplicates
    document.removeEventListener('keydown', handleBoatKeyPress);
    
    document.querySelector('.task-section').innerHTML = `
        <h2>Ostas Regate</h2>
        <p style="color: #ffaa00; font-size: 24px; font-weight: bold;">SPIED SPACE!</p>
        <h3 id="boat-timer">0.00 s</h3>
        <p id="boat-progress" style="font-size: 20px;">Spiedienu skaits: 0/${BOAT_RACE_CONFIG.REQUIRED_PRESSES}</p>`;
    
    // Update timer
    boatInterval = setInterval(() => {
        if (boatRaceActive) {
            const elapsed = ((Date.now() - boatStartTime) / 1000).toFixed(2);
            const timerEl = document.getElementById('boat-timer');
            if (timerEl) timerEl.innerText = elapsed + ' s';
        }
    }, 50);
    
    // Listen for spacebar
    document.addEventListener('keydown', handleBoatKeyPress);
}

function handleBoatKeyPress(e) {
    if (!boatRaceActive) return;
    
    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        boatSpaceCount++;
        
        const progressEl = document.getElementById('boat-progress');
        if (progressEl) progressEl.innerText = `Spiedienu skaits: ${boatSpaceCount}/${BOAT_RACE_CONFIG.REQUIRED_PRESSES}`;
        
        if (boatSpaceCount >= BOAT_RACE_CONFIG.REQUIRED_PRESSES) {
            finishBoatRace();
        }
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
    
    score += points;
    enforceScoreLimits();
    
    document.getElementById('score-display').innerText = "Punkti: " + score;
    
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
    completedTasks++; 
    updateMapState(); 
    if(completedTasks === 10) showEndGame(); 
}


function showMiniGame(type) {
    document.getElementById('game-modal').style.display = "block";
    const content = document.querySelector('.task-section');
    
    if (type === 'Cietums') {
        const code = myRole === 'host' ? "4 2 _ _" : "_ _ 9 1";
        content.innerHTML = `<h2>Cietums</h2><p>Kods: ${code}</p><input id="mini-input"><button class="btn" onclick="checkMini('4291')">OK</button>`;
    } else {
        content.innerHTML = `<h2>Gatavs?</h2><button class="btn" onclick="sendReady()">JĀ</button><p id="partner-status" style="display:none">Gaidu...</p>`;
    }
}

function checkMini(ans) {
    if(document.getElementById('mini-input').value === ans) sendReady();
}

function sendReady() {
    ws.send(JSON.stringify({ action: 'update_task', code: myLobbyCode, role: myRole }));
    document.querySelector('.task-section').innerHTML = "<h2>Gaidam otru...</h2>";
}

async function showQuiz(type) {
    document.getElementById('game-modal').style.display = "block";
    const task = questions[type];
    
    let q = task.q;
    if(currentLang !== 'lv') q = await translateText(q, currentLang.toUpperCase());

    document.querySelector('.task-section').innerHTML = `
        <h2>${type}</h2><p>${q}</p>
        <input id="ans-in" placeholder="Tava atbilde..." maxlength="50"><button class="btn" onclick="checkAns('${task.a}')">Iesniegt</button>
    `;
}

/**
 * Enforce score limits (minimum 0, maximum 100)
 */
function enforceScoreLimits() {
    if (score < 0) score = 0;
    if (score > 100) score = 100;
}

function checkAns(correct) {
    const val = document.getElementById('ans-in').value;
    if(val.toLowerCase() === correct.toLowerCase()) {
        score += 10;
    } else {
        score -= 5;
    }
    
    enforceScoreLimits();
    
    document.getElementById('score-display').innerText = "Punkti: " + score;
    document.getElementById('game-modal').style.display = 'none';
    completedTasks++;
    updateMapState();
    if(completedTasks === 10) showEndGame();
}

function showEndGame() { 
    // Calculate elapsed time
    const endTime = Date.now();
    const elapsedSeconds = Math.floor((endTime - startTime) / 1000);
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    enforceScoreLimits();
    
    finishGame(globalName, score, formattedTime); 
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
function toggleModal(id) { document.getElementById(id).style.display = document.getElementById(id).style.display==="block"?"none":"block"; }
function exitGame() { window.close(); }
function setMusicVolume(v) { 
    const music = document.getElementById('bg-music');
    if (music) {
        music.volume = v/100;
        localStorage.setItem('musicVolume', v);
    }
}
function setSFXVolume(v) { 
    const sfx = document.getElementById('hover-sound');
    if (sfx) {
        sfx.volume = v/100;
        localStorage.setItem('sfxVolume', v);
    }
}

// --- SPOTIFY PLAYER INTEGRATION ---

/**
 * Toggle Spotify playlist playback
 * Creates a minimalistic embedded player on first play
 */
function toggleSpotifyPlayback() {
    const container = document.getElementById('spotify-embed-container');
    const button = document.getElementById('spotify-play-btn');
    
    if (container.style.display === 'none') {
        // First time - load the Spotify embed
        if (!container.innerHTML.trim()) {
            const playlistId = SPOTIFY_PLAYLIST_URL.split('/').pop().split('?')[0];
            
            container.innerHTML = `<iframe 
                src="https://open.spotify.com/embed/playlist/${playlistId}?utm_source=generator&theme=0" 
                width="100%" 
                height="152" 
                frameBorder="0" 
                allowfullscreen="" 
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                loading="lazy">
            </iframe>`;
            
            // Pause local music when Spotify starts
            const localMusic = document.getElementById('bg-music');
            if (localMusic) {
                localMusic.pause();
            }
        }
        container.style.display = 'block';
        button.innerHTML = '<span style="font-size: 24px; margin-right: 8px;">⏸️</span><span style="font-size: 16px; font-weight: bold;">Paslēpt Spotify</span>';
    } else {
        container.style.display = 'none';
        button.innerHTML = '<span style="font-size: 24px; margin-right: 8px;">▶️</span><span style="font-size: 16px; font-weight: bold;">Atskaņot Spotify</span>';
    }
}

// --- NOTIFICATION SYSTEM (TOAST) ---

/**
 * Show a toast notification to the user
 * @param {string} message - Message to display
 * @param {string} type - Notification type: 'success', 'error', 'info', 'warning'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
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