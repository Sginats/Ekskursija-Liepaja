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

const _ac = (function() {
    let activeTask = false;
    let taskType = null;
    let violations = 0;
    let devToolsOpen = false;
    return {
        get activeTask() { return activeTask; },
        set activeTask(v) { activeTask = v; },
        get taskType() { return taskType; },
        set taskType(v) { taskType = v; },
        get violations() { return violations; },
        addViolation: function() { violations++; },
        get devToolsOpen() { return devToolsOpen; },
        set devToolsOpen(v) { devToolsOpen = v; }
    };
})();

const TOTAL_TASKS = 10;

// DevTools detection
(function _detectDevTools() {
    const threshold = 160;
    const check = function() {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        if (widthThreshold || heightThreshold) {
            if (!_ac.devToolsOpen) {
                _ac.devToolsOpen = true;
                _ac.addViolation();
                if (typeof showNotification === 'function') {
                    showNotification('Izstrādātāja rīki atvērti — tas var ietekmēt spēli!', 'warning', 5000);
                }
            }
        } else {
            _ac.devToolsOpen = false;
        }
    };
    setInterval(check, 1000);
    window.addEventListener('resize', check);
})();

// Disable right-click context menu on game elements
document.addEventListener('contextmenu', function(e) {
    if (e.target.closest('.modal-content, .map-area, .task-section, .quiz-form')) {
        e.preventDefault();
    }
});

// Suppress console methods to reduce info leaks
(function() {
    const _noop = function() {};
    try {
        Object.defineProperty(window, 'console', {
            get: function() {
                return { log: _noop, warn: _noop, error: _noop, info: _noop, debug: _noop, dir: _noop, table: _noop, trace: _noop, assert: _noop, clear: _noop, group: _noop, groupEnd: _noop, groupCollapsed: _noop, time: _noop, timeEnd: _noop };
            },
            set: _noop
        });
    } catch(e) { /* Browser may block property override */ }
})();

let currentTask = "";
let startTime; 
let myRole = '';
let myLobbyCode = '';
let globalName = "Anonīms";
let ws = null;
let quizWrongCount = 0;


// Configuration
const WS_PORT = 8080;
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const POLL_INTERVAL = 2000;
const WS_TIMEOUT = 2000;

const CONNECTION_MODE_PHP = 'php-polling';
const CONNECTION_MODE_WS = 'websocket';
let connectionMode = CONNECTION_MODE_PHP;

const taskSequence = [
    'Mols', 'Dzintars', 'Teatris', 'Kanals', 'Osta', 
    'LSEZ', 'Cietums', 'RTU', 'Ezerkrasts', 'Parks'
];

// Answer verification system — answers stored as pre-computed hashes only
const _k = [76,105,101,112,196,129,106,97];
function _v(hex) {
    const b = [];
    for (let i = 0; i < hex.length; i += 2) b.push(parseInt(hex.substring(i, i + 2), 16));
    return new TextDecoder().decode(new Uint8Array(b.map((c, i) => c ^ _k[i % _k.length])));
}

// Anti-cheat: Session integrity token for score submission
const _sessionNonce = (function() {
    const arr = new Uint32Array(2);
    if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(arr);
    } else {
        arr[0] = (Math.random() * 0xFFFFFFFF) >>> 0;
        arr[1] = (Math.random() * 0xFFFFFFFF) >>> 0;
    }
    return arr[0].toString(36) + arr[1].toString(36);
})();
const _taskCompletionLog = [];
function _generateScoreToken(score, time, completedTasks) {
    const raw = `${_sessionNonce}:${score}:${time}:${completedTasks}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        const chr = raw.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return Math.abs(hash).toString(36) + '-' + _sessionNonce;
}

const questionsPool = {
    'RTU': [
        { q: "Kurā gadā dibināta Liepājas akadēmija?", _a: "7d505044", fact: "RTU Liepājas akadēmija dibināta 1954. gadā!" },
        { q: "Kāda IT studiju programma ir pieejama RTU Liepājā?", _a: "0808111fb6e80100", fact: "Datorika ir viena no populārākajām programmām RTU Liepājā!" },
        { q: "Kurā pilsētas daļā atrodas RTU Liepājas akadēmija?", _a: "2f0c0b04b645eb", fact: "RTU Liepājas akadēmija atrodas pašā pilsētas centrā!" }
    ],
    'Mols': [
        { q: "Cik metrus garš ir Ziemeļu mols?", _a: "7d515540", fact: "Ziemeļu mols ir aptuveni 1800 metrus garš!" },
        { q: "Ko cilvēki dara uz Ziemeļu mola? (makšķerē/peld)", _a: "21080eb56545dd043eadf6", fact: "Mols ir populāra makšķerēšanas vieta!" },
        { q: "Kuras ostas daļā atrodas Ziemeļu mols? (ziemeļu/dienvidu)", _a: "3600001da145d614", fact: "Mols atrodas ostas ziemeļu pusē." }
    ],
    'Cietums': [
        { q: "Kā sauc Karostas tūrisma cietumu?", _a: "0708171fb7f50b126c0a0c15b0f40712", fact: "Vienīgais militārais cietums atvērts tūristiem!" },
        { q: "Kurā gadā celts Karostas cietums?", _a: "7d505540", fact: "Cietums celts 1900. gadā cara armijas vajadzībām." },
        { q: "Kam sākotnēji bija paredzēts Karostas cietums? (armija/civīliem)", _a: "2d1b0819aee0", fact: "Cietums bija paredzēts cara armijas vajadzībām." }
    ],
    'Dzintars': [
        { q: "Kā sauc Liepājas koncertzāli?", _a: "0000001ca5e8194108130c1eb0e01812", fact: "Izskatās pēc milzīga dzintara gabala!" },
        { q: "Kurā gadā atklāta koncertzāle 'Lielais Dzintars'?", _a: "7e595445", fact: "Koncertzāle atklāta 2015. gadā." },
        { q: "Kura orķestra mājvieta ir Lielais Dzintars? (Simfoniskā/Kamermūzikas)", _a: "1f000816abef031227ade4", fact: "Liepājas Simfoniskais orķestris šeit uzstājas regulāri!" }
    ],
    'Teatris': [
        { q: "Kurā gadā dibināts Liepājas Teātris?", _a: "7d505547", fact: "Vecākais profesionālais teātris Latvijā!" },
        { q: "Kādā arhitektūras stilā celta Liepājas Teātra ēka?", _a: "26acce17a1ef0e1238000903", fact: "Teātra ēka ir skaists jūgendstila piemērs!" },
        { q: "Vai Liepājas Teātris ir vecākais profesionālais teātris Latvijā? (Jā/Nē)", _a: "06ade4", fact: "Dibināts 1907. gadā — vecākais profesionālais teātris!" }
    ],
    'Kanals': [
        { q: "Kā sauc kanālu starp ezeru un jūru?", _a: "18001714beef03042fadce12a5f2", fact: "Tirdzniecības kanāls savieno ezeru ar jūru." },
        { q: "Kopš kura gadsimta kalpo Tirdzniecības kanāls?", _a: "7d5f", fact: "Kanāls kalpo kopš 16. gadsimta!" },
        { q: "Ko Tirdzniecības kanāls savieno? (ezeru un jūru/upes)", _a: "29130002b1a11f0f6c03a0dbb6f4", fact: "Kanāls savieno Liepājas ezeru ar Baltijas jūru." }
    ],
    'Osta': [
        { q: "Kā sauc Liepājas speciālo zonu?", _a: "003a202a", fact: "Osta šeit neaizsalst!" },
        { q: "Vai Liepājas osta aizsalst ziemā? (Jā/Nē)", _a: "02adf6", fact: "Liepājas osta neaizsalst — unikāla iezīme!" },
        { q: "Kā sauc ostas speciālo ekonomisko zonu? (LSEZ/LREZ)", _a: "003a202a", fact: "Liepājas Speciālā ekonomiskā zona piesaista investorus." }
    ],
    'Parks': [
        { q: "Kā sauc parku pie jūras?", _a: "06acce02a9e006003f", fact: "Viens no lielākajiem parkiem Latvijā!" },
        { q: "Kurā gadsimtā ierīkots Jūrmalas parks?", _a: "7d50", fact: "Parks ierīkots 19. gadsimta beigās." },
        { q: "Cik koku un krūmu sugu aug Jūrmalas parkā? (170/50/300)", _a: "7d5e55", fact: "Parkā aug vairāk nekā 170 koku un krūmu sugas!" }
    ],
    'LSEZ': [
        { q: "Vai UPB ir Liepājas uzņēmums (Jā/Nē)?", _a: "06ade4", fact: "UPB būvē ēkas visā pasaulē!" },
        { q: "Kurā gadā izveidota LSEZ?", _a: "7d505c47", fact: "LSEZ izveidota 1997. gadā." },
        { q: "Cik uzņēmumi darbojas LSEZ teritorijā? (80/20/200)", _a: "7459", fact: "Vairāk nekā 80 uzņēmumi darbojas LSEZ!" }
    ],
    'Ezerkrasts': [
        { q: "Kāda ezera krastā ir taka?", _a: "00000000000000003f", fact: "Liepājas ezers ir piektais lielākais Latvijā." },
        { q: "Kurš lielākais ezers Latvijā ir Liepājas ezers? (5./3./7.)", _a: "7947", fact: "Liepājas ezers ir piektais lielākais Latvijā!" },
        { q: "Ko var vērot no Ezerkrasta takas skatu platformām? (putnus/zivis)", _a: "3c1c111eb1f2", fact: "Taka piedāvā skatu platformas putnu vērošanai!" }
    ]
};

const questions = {};
for (const loc in questionsPool) {
    const pool = questionsPool[loc];
    questions[loc] = pool[Math.floor(Math.random() * pool.length)];
}

const locationInfo = {
    'RTU': {
        name: 'RTU Liepājas akadēmija',
        desc: 'Rīgas Tehniskās universitātes Liepājas akadēmija (dibināta 1954. gadā) ir viena no nozīmīgākajām augstākās izglītības iestādēm Kurzemē. Tā piedāvā studiju programmas inženierzinātnēs, IT (Datorika), ekonomikā un humanitārajās zinātnēs. Studiju programma "Datorika" ietver programmēšanu, datoru tīklus, datu bāzes un mākslīgo intelektu.'
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
    initTheme();
    initBackground();
    
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
    const sfx = document.getElementById('hover-sound');
    if (sfx) {
        const savedSFXVolume = localStorage.getItem('sfxVolume');
        sfx.volume = savedSFXVolume ? savedSFXVolume / 100 : 0.5;
    }
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
    initAnimationToggle();
    if (animationsEnabled) {
        initCursorTrail();
    }
});

// Connection manager

async function initSmartConnection() {
    console.log("Initializing multiplayer connection...");
    updateConnectionStatus('reconnecting');
    
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (isLocalhost) {
        console.log("Localhost detected, trying WebSocket first...");
        const wsAvailable = await tryWebSocketConnection();
        
        if (wsAvailable) {
            console.log("WebSocket detected");
            connectionMode = CONNECTION_MODE_WS;
            updateConnectionStatus('connected');
            showNotification('WebSocket detected', 'success', 2000);
            if (myRole && myLobbyCode && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: 'rejoin', code: myLobbyCode, role: myRole }));
                console.log(`Rejoining lobby ${myLobbyCode} as ${myRole}`);
            }
            return;
        } else {
            console.log("WebSocket unavailable, using PHP polling");
        }
    }
    
    console.log("PHP fallback mode no websocket detected");
    connectionMode = CONNECTION_MODE_PHP;
    initPHPPolling();
    showNotification('Multiplayer gatavs!', 'success', 2000);
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
        myRole = 'host';
        const waitEl = document.getElementById('lobby-wait');
        if (waitEl) {
            waitEl.innerHTML = 'Spēlētājs pievienojās!<br><button class="btn" id="btn-host-ready" style="margin-top:15px;" onclick="sendLobbyReady()">Esmu gatavs!</button><p id="lobby-ready-status" style="color:#ccc;margin-top:10px;"></p>';
        }
    }
    else if (data.type === 'joined_lobby') {
        myRole = 'guest';
        myLobbyCode = data.code;
        toggleModal('mode-modal');
        setTimeout(() => {
            toggleModal('lobby-modal');
            const lobbyCodeEl = document.getElementById('lobby-code');
            if (lobbyCodeEl) lobbyCodeEl.innerText = myLobbyCode;
            const waitEl = document.getElementById('lobby-wait');
            if (waitEl) {
                waitEl.innerHTML = 'Pievienojies istabai!<br><button class="btn" id="btn-guest-ready" style="margin-top:15px;" onclick="sendLobbyReady()">Esmu gatavs!</button><p id="lobby-ready-status" style="color:#ccc;margin-top:10px;"></p>';
            }
        }, 100);
    }
    else if (data.type === 'player_ready') {
        const statusEl = document.getElementById('lobby-ready-status');
        if (statusEl) statusEl.innerText = 'Otrs spēlētājs ir gatavs!';
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
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
        return;
    }

    try {
        const wsUrl = `${WS_PROTOCOL}//${window.location.hostname || 'localhost'}:${WS_PORT}`;
        
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log("WebSocket savienots!");
            wsReconnectAttempts = 0;
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
    console.log("PHP fallback mode no websocket detected");
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
    if (name.length > 8) name = name.substring(0, 8);
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
    _ac.activeTask = true;
    _ac.taskType = type;

    if (type === 'Osta') showLocationThenStart(type, function() { startBoatGame(); });
    else if (type === 'RTU') showLocationThenStart(type, function() { startAntGame(); });
    else if (type === 'Teatris') showLocationThenStart(type, function() { startHistorySequence(); });
    else if (type === 'Mols') showLocationThenStart(type, function() { startFishingGame(); });
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
    document.removeEventListener('keydown', handleBoatKeyPress);
    
    document.querySelector('.task-section').innerHTML = `
        <h2>Ostas Regate</h2>
        <p style="color: #ffaa00; font-size: 24px; font-weight: bold;">${actionText}</p>
        <h3 id="boat-timer">0.00 s</h3>
        <p id="boat-progress" style="font-size: 20px;">Spiedienu skaits: 0/${BOAT_RACE_CONFIG.REQUIRED_PRESSES}</p>
        <button id="boat-tap-btn" class="boat-tap-btn">SPIED!</button>`;
    
    boatInterval = setInterval(() => {
        if (boatRaceActive) {
            const elapsed = ((Date.now() - boatStartTime) / 1000).toFixed(2);
            const timerEl = document.getElementById('boat-timer');
            if (timerEl) timerEl.innerText = elapsed + ' s';
        }
    }, 50);
    document.addEventListener('keydown', handleBoatKeyPress);
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
    if (!_ac.activeTask || _ac.taskType !== 'Osta') {
        _ac.addViolation();
        showNotification('Aizdomīga darbība!', 'error', 3000);
        return;
    }
    _ac.activeTask = false;
    _ac.taskType = null;
    _taskCompletionLog.push({ task: 'Osta', time: Date.now() });
    boatRaceActive = false;
    if (boatInterval) clearInterval(boatInterval);
    document.removeEventListener('keydown', handleBoatKeyPress);
    document.getElementById('game-modal').style.display = 'none'; 
    GameState.completeTask(); 
    updateMapState(); 
    if(GameState.getCompleted() === TOTAL_TASKS) showEndGame(); 
}

let antGameActive = false;
let antsCaught = 0;
let antGameTimer = null;
const ANTS_REQUIRED = 5;
const ANT_GAME_TIME = 15; 
function startAntGame() {
    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <h2>RTU Bioloģijas uzdevums</h2>
        <p>Studiju programmā "Bioloģijas" studenti mācās risināt problēmas ātri un precīzi.</p>
        <p>Noķer ${ANTS_REQUIRED} kukaiņus ${ANT_GAME_TIME} sekunžu laikā!</p>
        <button class="btn btn-full" onclick="initAntGame()">SĀKT</button>
    `;
}

function initAntGame() {
    antGameActive = true;
    antsCaught = 0;
    let timeLeft = ANT_GAME_TIME;
    
    document.querySelector('.task-section').innerHTML = `
        <h2>🐛 Ķer kukaiņus!</h2>
        <p id="ant-timer" style="color: #ffaa00; font-size: 20px;">Laiks: ${timeLeft}s</p>
        <p id="ant-count" style="font-size: 18px;">Noķerti: 0/${ANTS_REQUIRED}</p>
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
    
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const antSize = isTouchDevice ? 44 : 28;
    const moveInterval = isTouchDevice ? 1400 : 800;
    
    const ant = document.createElement('div');
    ant.className = 'game-ant';
    ant.textContent = '🐛';
    ant.style.cssText = `position: absolute; font-size: ${antSize}px; cursor: pointer; user-select: none; transition: all 0.3s ease; z-index: 10; padding: ${isTouchDevice ? '8px' : '0'};`;
    ant.style.left = Math.random() * 85 + '%';
    ant.style.top = Math.random() * 85 + '%';
    
    ant.addEventListener('click', function(e) {
        e.preventDefault();
        if (!antGameActive) return;
        antsCaught++;
        this.textContent = '💥';
        setTimeout(() => { if (this.parentNode) this.parentNode.removeChild(this); }, 200);
        
        const countEl = document.getElementById('ant-count');
        if (countEl) countEl.textContent = `Noķerti: ${antsCaught}/${ANTS_REQUIRED}`;
        
        if (antsCaught >= ANTS_REQUIRED) { finishAntGame(true); }
        else { setTimeout(spawnAnt, 300); }
    });
    
    field.appendChild(ant);
    const moveAnt = setInterval(() => {
        if (!antGameActive || !ant.parentNode) { clearInterval(moveAnt); return; }
        ant.style.left = Math.random() * 85 + '%';
        ant.style.top = Math.random() * 85 + '%';
    }, moveInterval);
    if (antsCaught > 2 && antGameActive) setTimeout(() => { if (antGameActive) spawnAnt(); }, 2000);
}

function finishAntGame(success) {
    antGameActive = false;
    if (antGameTimer) clearInterval(antGameTimer);
    
    const guideHint = document.getElementById('guide-hint');
    if (guideHint) guideHint.textContent = getRandomBubble(success);
    
    if (success) {
        GameState.addScore(10);
        document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>Lielisks darbs!</h2>
            <p>Noķerti kukaiņi: ${antsCaught}/${ANTS_REQUIRED}</p>
            <p style="color: #4CAF50;">+10 punkti</p>
            <p style="color: #ffaa00; font-style: italic;">${questions['RTU'].fact}</p>
            <button class="btn btn-full" onclick="closeAntGame()">Turpināt →</button>
        `;
    } else {
        GameState.addScore(-5);
        document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>Laiks beidzies!</h2>
            <p>Noķerti kukaiņi: ${antsCaught}/${ANTS_REQUIRED}</p>
            <p style="color: #f44336;">-5 punkti. Mēģini vēlreiz!</p>
            <button class="btn btn-full" onclick="initAntGame()">Mēģināt vēlreiz</button>
        `;
    }
}

function closeAntGame() {
    if (!_ac.activeTask || _ac.taskType !== 'RTU') {
        _ac.addViolation();
        showNotification('Aizdomīga darbība!', 'error', 3000);
        return;
    }
    _ac.activeTask = false;
    _ac.taskType = null;
    _taskCompletionLog.push({ task: 'RTU', time: Date.now() });
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask();
    updateMapState();
    if (GameState.getCompleted() === TOTAL_TASKS) showEndGame();
}

const historyEvents = [
    { year: 1625, text: "Liepāja iegūst pilsētas tiesības" },
    { year: 1907, text: "Dibināts Liepājas Teātris" },
    { year: 2015, text: "Atklāta koncertzāle 'Lielais Dzintars'" }
];

function startHistorySequence() {
    document.getElementById('game-modal').style.display = 'block';
    
    const shuffled = [...historyEvents].sort(() => Math.random() - 0.5);
    
    document.querySelector('.task-section').innerHTML = `
        <h2>Vēsturiskā secība</h2>
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
        <p style="font-size: 12px; color: #aaa;">Spied uz notikumiem lai pārvietotu augšup</p>
        <button class="btn btn-full" onclick="checkHistorySequence()">Iesniegt secību</button>
    `;
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', function() {
            const container = document.getElementById('history-slots');
            const items = Array.from(container.querySelectorAll('.history-item'));
            const idx = items.indexOf(this);
            if (idx > 0) {
                container.insertBefore(this, items[idx - 1]);
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
    
    const guideHint = document.getElementById('guide-hint');
    if (guideHint) guideHint.textContent = getRandomBubble(isCorrect);
    
    if (isCorrect) {
        GameState.addScore(10);
        document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
        const correctOrder = [...historyEvents].sort((a, b) => a.year - b.year);
        document.querySelector('.task-section').innerHTML = `
            <h2>Pareizi!</h2>
            <p>Pareizā secība:</p>
            <ol style="margin: 10px 0; padding-left: 20px;">
                ${correctOrder.map(ev => `<li>${ev.year}. g. — ${ev.text}</li>`).join('')}
            </ol>
            <p style="color: #4CAF50;">+10 punkti</p>
            <p style="color: #ffaa00; font-style: italic;">${questions['Teatris'].fact}</p>
            <button class="btn btn-full" onclick="closeHistoryGame()">Turpināt →</button>
        `;
    } else {
        GameState.addScore(-5);
        document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>Nepareizi!</h2>
            <p style="color: #f44336;">Secība nav pareiza. -5 punkti. Mēģini vēlreiz!</p>
            <button class="btn btn-full" onclick="startHistorySequence()">Mēģināt vēlreiz</button>
        `;
    }
}

function closeHistoryGame() {
    if (!_ac.activeTask || _ac.taskType !== 'Teatris') {
        _ac.addViolation();
        showNotification('Aizdomīga darbība!', 'error', 3000);
        return;
    }
    _ac.activeTask = false;
    _ac.taskType = null;
    _taskCompletionLog.push({ task: 'Teatris', time: Date.now() });
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask();
    updateMapState();
    if (GameState.getCompleted() === TOTAL_TASKS) showEndGame();
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
    }else{sendReady()}
     
}

const _miniCode = '785b5c41';

function checkMini() {
    if(document.getElementById('mini-input').value === _v(_miniCode)) sendReady();
}

function sendLobbyReady() {
    if (connectionMode === CONNECTION_MODE_WS && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'ready', code: myLobbyCode, role: myRole }));
        const statusEl = document.getElementById('lobby-ready-status');
        if (statusEl) statusEl.innerText = 'Gaidu otru spēlētāju...';
        const readyBtn = document.getElementById('btn-host-ready') || document.getElementById('btn-guest-ready');
        if (readyBtn) readyBtn.disabled = true;
    }
}

function sendReady() {
    if (connectionMode === CONNECTION_MODE_WS && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'update_task', code: myLobbyCode, role: myRole }));
        document.querySelector('.task-section').innerHTML = "<h2>Gaidam otru...</h2>";
    } else if (connectionMode === CONNECTION_MODE_PHP) {
        notifyPartnerPHP(myRole, myLobbyCode);
        document.querySelector('.task-section').innerHTML = "<h2>Gaidam otru...</h2>";
    } else {
        showNotification("Savienojums nav pieejams!", 'error');
        console.error("sendReady failed: No valid connection mode available");
    }
}

async function showQuiz(type) {
    document.getElementById('game-modal').style.display = "block";
    const task = questions[type];
    quizWrongCount = 0;
    
    let q = task.q;

    document.querySelector('.task-section').innerHTML = `
        <h2>${type}</h2><p>${q}</p>
        <div class="quiz-form">
            <input id="ans-in" placeholder="Tava atbilde..." maxlength="50">
            <button class="btn btn-full" onclick="checkAns('${type}')">Iesniegt</button>
        </div>
    `;
    setupQuizEnterKey(type);
}

function setupQuizEnterKey(type) {
    const input = document.getElementById('ans-in');
    if (input) {
        input.onkeydown = function(e) {
            if (e.key === 'Enter') { e.preventDefault(); checkAns(type); }
        };
        input.focus();
    }
}

function showTheory(type) {
    const info = locationInfo[type];
    if (!info) return;
    document.querySelector('.task-section').innerHTML = `
        <div class="location-info">
            <h3>📍 ${info.name}</h3>
            <p>${info.desc}</p>
        </div>
        <button class="btn" id="btn-back-to-quiz">Atpakaļ uz jautājumu →</button>
    `;
    document.getElementById('btn-back-to-quiz').addEventListener('click', function() {
        showQuizForm(type);
    });
}

function showQuizForm(type) {
    const task = questions[type];
    document.querySelector('.task-section').innerHTML = `
        <h2>${type}</h2><p>${task.q}</p>
        <div class="quiz-form">
            <input id="ans-in" placeholder="Tava atbilde..." maxlength="50">
            <button class="btn btn-full" onclick="checkAns('${type}')">Iesniegt</button>
        </div>
    `;
    setupQuizEnterKey(type);
}

function checkAns(type) {
    const val = document.getElementById('ans-in').value;
    const correct = _v(questions[type]._a);
    const isCorrect = val.toLowerCase().trim() === correct.toLowerCase();
    const guideHint = document.getElementById('guide-hint');
    if (guideHint) guideHint.textContent = getRandomBubble(isCorrect);
    
    if(isCorrect) {
        const points = quizWrongCount === 0 ? 10 : 5;
        GameState.addScore(points);
        showNotification(`Pareiza atbilde! +${points} punkti`, 'success', 2000);
        document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
        document.querySelector('.task-section').innerHTML = `
            <h2>${type}</h2>
            <p style="color: #4CAF50; font-size: 18px;">Pareizi!</p>
            <p><strong>Atbilde:</strong> ${correct}</p>
            <p style="color: #ffaa00; font-style: italic;">${questions[type].fact}</p>
            <button class="btn btn-full" onclick="closeQuizAndContinue()">Turpināt →</button>
        `;
    } else {
        quizWrongCount++;
        if (quizWrongCount >= 2) {
            showNotification('2 nepareizas atbildes. 0 punkti.', 'error', 3000);
            document.getElementById('score-display').innerText = "Punkti: " + GameState.getScore();
            document.querySelector('.task-section').innerHTML = `
                <h2>${type}</h2>
                <p style="color: #f44336; font-size: 18px;">Nepareizi!</p>
                <p style="color: #aaa; font-size: 14px;">2 nepareizas atbildes — 0 punkti</p>
                <p><strong>Pareizā atbilde:</strong> ${correct}</p>
                <p style="color: #ffaa00; font-style: italic;">${questions[type].fact}</p>
                <button class="btn btn-full" onclick="closeQuizAndContinue()">Turpināt →</button>
            `;
        } else {
            showNotification('Nepareiza atbilde! Vēl 1 mēģinājums.', 'error', 2000);
            document.querySelector('.task-section').innerHTML = `
                <h2>${type}</h2>
                <p style="color: #f44336; font-size: 18px;">Nepareizi! Vēl 1 mēģinājums.</p>
                <p style="color: #aaa; font-size: 14px;">(Pareiza atbilde tagad dos +5 punktus)</p>
                <div class="quiz-form">
                    <input id="ans-in" placeholder="Mēģini vēlreiz..." maxlength="50">
                    <button class="btn btn-full" onclick="checkAns('${type}')">Iesniegt atkārtoti</button>
                </div>
            `;
            setupQuizEnterKey(type);
        }
    }
}

function closeQuizAndContinue() {
    if (!_ac.activeTask) {
        _ac.addViolation();
        showNotification('Aizdomīga darbība!', 'error', 3000);
        return;
    }
    quizWrongCount = 0;
    _ac.activeTask = false;
    _ac.taskType = null;
    _taskCompletionLog.push({ task: currentTask, time: Date.now() });
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask();
    updateMapState();
    if(GameState.getCompleted() === TOTAL_TASKS) showEndGame();
}

function showEndGame() { 
    if (GameState.getCompleted() !== TOTAL_TASKS || _taskCompletionLog.length < TOTAL_TASKS) {
        _ac.addViolation();
        showNotification('Spēle nav pabeigta!', 'error', 3000);
        return;
    }
    const endTime = Date.now();
    const elapsedSeconds = Math.floor((endTime - startTime) / 1000);
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    const finalScore = GameState.getScore();
    showEndGameScreen(finalScore, formattedTime);
}

let _endGameShown = false;
function showEndGameScreen(finalScore, formattedTime) {
    if (GameState.getCompleted() !== TOTAL_TASKS || _taskCompletionLog.length < TOTAL_TASKS || _endGameShown) {
        _ac.addViolation();
        showNotification('Aizdomīga darbība!', 'error', 3000);
        return;
    }
    _endGameShown = true;
    document.getElementById('game-modal').style.display = 'block';
    
    let medal = '🥉';
    if (finalScore >= 80) medal = '🥇';
    else if (finalScore >= 50) medal = '🥈';
    
    document.querySelector('.task-section').innerHTML = `
        <div style="text-align: center;">
            <h2 style="color: #ffaa00; font-size: 28px;">${medal} Apsveicam! ${medal}</h2>
            <p style="font-size: 18px;">Tu esi pabeidzis ekskursiju pa Liepāju!</p>
            <div style="background: rgba(0,0,0,0.3); border: 2px solid #ffaa00; border-radius: 12px; padding: 20px; margin: 15px 0;">
                <p style="font-size: 22px; color: #ffaa00; margin: 5px 0;">Punkti: <strong>${finalScore}</strong>/100</p>
                <p style="font-size: 22px; color: #ffaa00; margin: 5px 0;">Laiks: <strong>${formattedTime}</strong></p>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                <button class="btn btn-full" id="btn-save-score">Saglabāt un skatīt TOP 10</button>
                <button class="btn btn-full" id="btn-back-menu">Atpakaļ uz menu</button>
                <button class="btn btn-full" id="btn-play-again">Spēlēt vēlreiz</button>
            </div>
        </div>
    `;
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
const guideBubbles = {
    correct: [
        "Lielisks darbs! Tu esi īsts Liepājas eksperts! ",
        "Pareizi! Tu zini Liepāju kā savu kabatu! ",
        "Bravo! Tā turpini! ",
        "Izcili! Tu esi pelnījis aplausus! ",
        "Super! Nākamais izaicinājums gaida! "
    ],
    wrong: [
        "Hmm, tā nav pareizā atbilde... Mēģini vēlreiz nākamreiz! ",
        "Nekas, arī kļūdīties ir cilvēcīgi! ",
        "Ak, gandrīz! Bet nepadodies! ",
        "Tā nebija... Bet galvenais ir mācīties! ",
        "Ups! Nākamreiz noteikti sanāks! "
    ]
};

function getRandomBubble(isCorrect) {
    const arr = isCorrect ? guideBubbles.correct : guideBubbles.wrong;
    return arr[Math.floor(Math.random() * arr.length)];
}

function finishGame(name, finalScore, time) { 
    if (GameState.getCompleted() !== TOTAL_TASKS || _taskCompletionLog.length < TOTAL_TASKS) {
        showNotification('Nevar saglabāt — spēle nav pabeigta!', 'error', 3000);
        return;
    }

    const token = _generateScoreToken(finalScore, time, _taskCompletionLog.length);
    const formData = new FormData();
    formData.append('name', name);
    formData.append('score', finalScore);
    formData.append('time', time);
    formData.append('token', token);
    formData.append('tasks', _taskCompletionLog.length);
    formData.append('violations', _ac.violations);
    
    fetch('src/php/save_score.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.text())
    .then(function() {
        location.href = 'src/php/leaderboard.php';
    })
    .catch(function() {
        location.href = 'src/php/leaderboard.php';
    });
}

function exitGame() { window.location.href = 'https://www.google.com'; }
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
        'dark': 'rgba(187, 134, 252,',
        'light': 'rgba(255, 68, 68,',
        'blue': 'rgba(255, 215, 0,'
    };
    return colors[theme] || colors['default'];
}

function initCursorTrail() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouchDevice) return;
    const canvas = document.getElementById('cursor-canvas');
    if (!canvas) return;
    if (cursorTrailAnimId) {
        cancelAnimationFrame(cursorTrailAnimId);
        cursorTrailAnimId = null;
    }
    const ctx = canvas.getContext('2d');

    let mouseMoved = false;
    const pointer = {
        x: 0.5 * window.innerWidth,
        y: 0.5 * window.innerHeight,
    };
    const pointsNumber = 30;
    const params = {
        widthFactor: 0.3,
        spring: 0.4,
        friction: 0.5
    };

    const trail = new Array(pointsNumber);
    for (let i = 0; i < pointsNumber; i++) {
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
        if (!animationsEnabled) return;

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
            ctx.lineWidth = params.widthFactor * (pointsNumber - i);
            const alpha = 1 - (i / trail.length);
            ctx.strokeStyle = colorBase + ' ' + alpha.toFixed(2) + ')';
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(xc, yc);
        }
        ctx.lineTo(trail[trail.length - 1].x, trail[trail.length - 1].y);
        ctx.stroke();

        cursorTrailAnimId = window.requestAnimationFrame(update);
    }

    cursorTrailAnimId = window.requestAnimationFrame(update);
}

// Theme system
function setTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('theme', themeName);
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
        'dark': 'Violeta',
        'light': 'Tumši sarkana',
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
        return;
    }
    
    buttons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-theme') === savedTheme) {
            btn.classList.add('active');
        }
    });
}

let bgCanvas = null;
let bgCtx = null;
let bgAnimId = null;
let bgParticles = [];
let bgResizeHandler = null;

function getBgThemeColor() {
    const theme = document.body.getAttribute('data-theme') || 'default';
    const colors = {
        'default': { r: 255, g: 170, b: 0   },
        'dark':    { r: 187, g: 134, b: 252  },
        'light':   { r: 255, g: 68,  b: 68   },
        'blue':    { r: 255, g: 215, b: 0    },
    };
    return colors[theme] || colors['default'];
}

function initBackground() {
    const wrap = document.getElementById('bg-wrap');
    if (!wrap) return;

    wrap.innerHTML = '';

    bgCanvas = document.createElement('canvas');
    bgCanvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    wrap.appendChild(bgCanvas);

    if (bgAnimId) {
        cancelAnimationFrame(bgAnimId);
        bgAnimId = null;
    }
    if (bgResizeHandler) {
        window.removeEventListener('resize', bgResizeHandler);
    }

    function resize() {
        bgCanvas.width = window.innerWidth;
        bgCanvas.height = window.innerHeight;
    }
    bgResizeHandler = resize;
    resize();
    window.addEventListener('resize', bgResizeHandler);

    bgCtx = bgCanvas.getContext('2d');

    const count = 70;
    bgParticles = [];
    for (let i = 0; i < count; i++) {
        bgParticles.push({
            x: Math.random() * bgCanvas.width,
            y: Math.random() * bgCanvas.height,
            radius: Math.random() * 2.5 + 0.5,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            phase: Math.random() * Math.PI * 2,
            phaseSpeed: Math.random() * 0.015 + 0.005,
            baseOpacity: Math.random() * 0.4 + 0.1,
        });
    }

    function drawBg() {
        bgAnimId = requestAnimationFrame(drawBg);

        const c = getBgThemeColor();
        const w = bgCanvas.width;
        const h = bgCanvas.height;

        bgCtx.clearRect(0, 0, w, h);

        bgParticles.forEach(p => {
            if (animationsEnabled) {
                p.x += p.vx;
                p.y += p.vy;
                p.phase += p.phaseSpeed;
                if (p.x < 0) p.x = w;
                if (p.x > w) p.x = 0;
                if (p.y < 0) p.y = h;
                if (p.y > h) p.y = 0;
            }

            const opacity = p.baseOpacity * (0.7 + 0.3 * Math.sin(p.phase));
            const r = p.radius * (0.9 + 0.2 * Math.sin(p.phase));

            const grd = bgCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 8);
            grd.addColorStop(0, `rgba(${c.r},${c.g},${c.b},${opacity * 0.8})`);
            grd.addColorStop(1, `rgba(${c.r},${c.g},${c.b},0)`);
            bgCtx.fillStyle = grd;
            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, r * 8, 0, Math.PI * 2);
            bgCtx.fill();

            bgCtx.fillStyle = `rgba(${c.r},${c.g},${c.b},${Math.min(opacity * 3, 1)})`;
            bgCtx.beginPath();
            bgCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
            bgCtx.fill();
        });

        for (let i = 0; i < bgParticles.length; i++) {
            for (let j = i + 1; j < bgParticles.length; j++) {
                const dx = bgParticles[i].x - bgParticles[j].x;
                const dy = bgParticles[i].y - bgParticles[j].y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < 150) {
                    bgCtx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${0.06 * (1 - d / 150)})`;
                    bgCtx.lineWidth = 0.5;
                    bgCtx.beginPath();
                    bgCtx.moveTo(bgParticles[i].x, bgParticles[i].y);
                    bgCtx.lineTo(bgParticles[j].x, bgParticles[j].y);
                    bgCtx.stroke();
                }
            }
        }
    }

    drawBg();
}

function toggleModal(id) {
    const modal = document.getElementById(id);
    const isOpening = modal.style.display !== "block";
    modal.style.display = isOpening ? "block" : "none";

    if (isOpening && id === 'settings-modal') {
        const savedTheme = localStorage.getItem('theme') || 'default';
        updateActiveThemeButton(savedTheme);
        const checkbox = document.getElementById('animation-toggle');
        if (checkbox) checkbox.checked = animationsEnabled;
    }
}

let animationsEnabled = true;
let cursorTrailAnimId = null;

function toggleAnimations(enabled) {
    animationsEnabled = enabled;
    localStorage.setItem('animationsEnabled', enabled ? '1' : '0');

    if (enabled) {
        document.body.classList.remove('no-animations');
        const canvas = document.getElementById('cursor-canvas');
        if (canvas) {
            canvas.style.display = '';
            initCursorTrail();
        }
    } else {
        document.body.classList.add('no-animations');
        if (cursorTrailAnimId) {
            cancelAnimationFrame(cursorTrailAnimId);
            cursorTrailAnimId = null;
        }
        const canvas = document.getElementById('cursor-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
        }
    }
    showNotification(enabled ? 'Animācijas ieslēgtas' : 'Animācijas izslēgtas', 'info', 2000);
}

function initAnimationToggle() {
    const saved = localStorage.getItem('animationsEnabled');
    if (saved === '0') {
        animationsEnabled = false;
        document.body.classList.add('no-animations');
        const canvas = document.getElementById('cursor-canvas');
        if (canvas) canvas.style.display = 'none';
    }
    const checkbox = document.getElementById('animation-toggle');
    if (checkbox) checkbox.checked = animationsEnabled;
}

function showNotification(message, type = 'info', duration = 3000) {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    const icon = {
        'success': '✓',
        'error': '✗',
        'warning': '⚠',
        'info': 'ℹ'
    }[type] || 'ℹ';
    
    notification.innerHTML = `<span class="notification-icon">${icon}</span><span class="notification-text">${message}</span>`;
    
    container.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);

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

// Fishing mini-game
const FISHING_CONFIG = {
    TENSION_INCREASE: 0.6,
    TENSION_DECREASE: 0.4,
    START_DISTANCE: 15.00,
    PROGRESS_DECAY: 0.005,
    DEADLINE_THRESHOLD: 80,
    FAIL_TIME_MAX: 1.5,
    FISH_PULL_CHANCE: 0.015,
    FISH_PULL_STRENGTH: 0.5,
    EXCELLENT_TIME: 10,
    GOOD_TIME: 20,
    EXCELLENT_POINTS: 15,
    GOOD_POINTS: 10,
    NORMAL_POINTS: 5
};

let fishingActive = false;
let tension = 0;
let distance = FISHING_CONFIG.START_DISTANCE;
let failTimer = 0;
let isHolding = false;
let fishingStartTime = 0;
let fishPullTimer = 0;
let waveOffset = 0;

function handleFishingKeyDown(e) {
    if (!fishingActive) return;
    if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        isHolding = true;
    }
}

function handleFishingKeyUp(e) {
    if (e.code === 'Space' || e.key === ' ') {
        isHolding = false;
    }
}

function handleFishingMouseUp() {
    isHolding = false;
}

function cleanupFishingListeners() {
    document.removeEventListener('keydown', handleFishingKeyDown);
    document.removeEventListener('keyup', handleFishingKeyUp);
    window.removeEventListener('mouseup', handleFishingMouseUp);
}

function startFishingGame() {
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const instruction = isTouchDevice
        ? 'Turi pogu nospiestu, lai pietuvinātu zivi! Nepārvelc auklu!'
        : 'Turi SPACE vai pogu nospiestu, lai pietuvinātu zivi! Nepārvelc auklu!';

    document.getElementById('game-modal').style.display = 'block';
    document.querySelector('.task-section').innerHTML = `
        <h2>🎣 Makšķerēšana</h2>
        <p>${instruction}</p>
        <p style="font-size: 13px; opacity: 0.7;">Sprieguma josla rāda auklas stāvokli — ja tā kļūst sarkana, aukla var pārtrūkt!</p>
        <button class="btn btn-full" onclick="initFishingLogic()">SĀKT</button>
    `;
}

function initFishingLogic() {
    fishingActive = true;
    tension = 0;
    distance = FISHING_CONFIG.START_DISTANCE;
    failTimer = 0;
    isHolding = false;
    fishPullTimer = 0;
    waveOffset = 0;
    fishingStartTime = Date.now();

    cleanupFishingListeners();

    document.querySelector('.task-section').innerHTML = `
        <div id="fishing-container">
            <canvas id="fishingCanvas" width="400" height="400"></canvas>
            <div id="fish-btn">🎣</div>
        </div>
    `;

    const btn = document.getElementById('fish-btn');
    const canvas = document.getElementById('fishingCanvas');
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    btn.addEventListener('mousedown', () => isHolding = true);
    window.addEventListener('mouseup', handleFishingMouseUp);
    btn.addEventListener('touchstart', (e) => { e.preventDefault(); isHolding = true; });
    btn.addEventListener('touchend', () => isHolding = false);
    document.addEventListener('keydown', handleFishingKeyDown);
    document.addEventListener('keyup', handleFishingKeyUp);

    function gameLoop() {
        if (!fishingActive) return;

        if (Math.random() < FISHING_CONFIG.FISH_PULL_CHANCE) {
            fishPullTimer = 15;
        }
        const fishPulling = fishPullTimer > 0;
        if (fishPullTimer > 0) fishPullTimer--;

        if (isHolding) {
            tension += FISHING_CONFIG.TENSION_INCREASE + (fishPulling ? FISHING_CONFIG.FISH_PULL_STRENGTH : 0);
            distance -= 0.05;
        } else {
            tension -= FISHING_CONFIG.TENSION_DECREASE;
            distance += FISHING_CONFIG.PROGRESS_DECAY + (fishPulling ? 0.02 : 0);
        }

        tension = Math.max(0, Math.min(tension, 100));
        distance = Math.max(0, Math.min(distance, FISHING_CONFIG.START_DISTANCE));

        if (tension >= FISHING_CONFIG.DEADLINE_THRESHOLD) {
            failTimer += 0.016;
            if (failTimer >= FISHING_CONFIG.FAIL_TIME_MAX || tension >= 100) return finishFishing(false);
        } else {
            failTimer = Math.max(0, failTimer - 0.01);
        }

        if (distance <= 0) return finishFishing(true);

        waveOffset += 0.03;
        drawFishing(ctx, canvas, fishPulling);
        requestAnimationFrame(gameLoop);
    }
    gameLoop();
}

function drawFishing(ctx, canvas, fishPulling) {
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Water waves
    const waterY = H * 0.45;
    ctx.fillStyle = 'rgba(30, 80, 140, 0.3)';
    ctx.beginPath();
    ctx.moveTo(0, waterY);
    for (let x = 0; x <= W; x += 5) {
        ctx.lineTo(x, waterY + Math.sin(x * 0.02 + waveOffset) * 6 + Math.sin(x * 0.05 + waveOffset * 1.5) * 3);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(20, 60, 120, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, waterY + 15);
    for (let x = 0; x <= W; x += 5) {
        ctx.lineTo(x, waterY + 15 + Math.sin(x * 0.03 + waveOffset * 0.7 + 2) * 5);
    }
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();

    // Fishing rod
    ctx.strokeStyle = '#6b3a1f';
    ctx.lineWidth = Math.min(6, W * 0.015);
    ctx.beginPath();
    ctx.moveTo(W * 0.03, H * 0.95);
    const curveOffset = isHolding ? (tension * 0.4) : 15;
    const tipX = W * 0.45;
    const tipY = H * 0.1;
    ctx.quadraticCurveTo(W * 0.1, H * 0.5 - curveOffset, tipX, tipY);
    ctx.stroke();

    // Fishing line
    const progress = 1 - (distance / FISHING_CONFIG.START_DISTANCE);
    const bobberX = tipX + (W * 0.55 - tipX) * (0.3 + progress * 0.5);
    const bobberY = waterY + 5 + Math.sin(waveOffset * 2) * 3;

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.quadraticCurveTo(bobberX, tipY + (bobberY - tipY) * 0.3, bobberX, bobberY);
    ctx.stroke();

    // Bobber
    ctx.fillStyle = '#ff3333';
    ctx.beginPath();
    ctx.arc(bobberX, bobberY - 4, Math.min(6, W * 0.015), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(bobberX, bobberY + 2, Math.min(5, W * 0.012), 0, Math.PI * 2);
    ctx.fill();

    // Fish silhouette
    const fishDist = distance / FISHING_CONFIG.START_DISTANCE;
    const fishX = bobberX + fishDist * W * 0.3;
    const fishY = waterY + 30 + Math.sin(waveOffset * 3 + 1) * 8;
    const fishSize = Math.min(18, W * 0.04);

    ctx.fillStyle = fishPulling ? 'rgba(255, 180, 50, 0.9)' : 'rgba(180, 200, 220, 0.7)';
    ctx.beginPath();
    ctx.ellipse(fishX, fishY, fishSize, fishSize * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(fishX + fishSize, fishY);
    ctx.lineTo(fishX + fishSize + fishSize * 0.5, fishY - fishSize * 0.4);
    ctx.lineTo(fishX + fishSize + fishSize * 0.5, fishY + fishSize * 0.4);
    ctx.closePath();
    ctx.fill();
    // Eye
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(fishX - fishSize * 0.4, fishY - fishSize * 0.1, 2, 0, Math.PI * 2);
    ctx.fill();

    // Fish pull indicator
    if (fishPulling) {
        ctx.fillStyle = `rgba(255, 170, 0, ${0.5 + Math.sin(Date.now() / 80) * 0.5})`;
        ctx.font = `bold ${Math.min(14, W * 0.035)}px Poppins, Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('🐟 Zivs velk!', W * 0.5, waterY - 15);
        ctx.textAlign = 'start';
    }

    // Tension bar
    const barW = Math.min(200, W * 0.5);
    const barH = Math.min(18, H * 0.045);
    const barX = (W - barW) / 2;
    const barY = 15;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, barX - 2, barY - 2, barW + 4, barH + 4, 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(ctx, barX, barY, barW, barH, 4);
    ctx.fill();

    const tensionW = (tension / 100) * barW;
    let grd = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grd.addColorStop(0, '#44ff44');
    grd.addColorStop(0.6, '#ffaa00');
    grd.addColorStop(1, '#ff4444');
    ctx.fillStyle = grd;
    roundRect(ctx, barX, barY, tensionW, barH, 4);
    ctx.fill();

    // Tension label
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `bold ${Math.min(11, W * 0.028)}px Poppins, Arial`;
    ctx.textAlign = 'center';
    ctx.fillText('Spriegums', W * 0.5, barY + barH + 14);

    // Warning text
    if (tension > FISHING_CONFIG.DEADLINE_THRESHOLD) {
        ctx.fillStyle = `rgba(255, 50, 50, ${0.5 + Math.abs(Math.sin(Date.now() / 100)) * 0.5})`;
        ctx.font = `bold ${Math.min(16, W * 0.04)}px Poppins, Arial`;
        ctx.fillText('⚠ UZMANĪBU!', W * 0.5, barY + barH + 32);
    }

    // Distance display
    const distBarW = Math.min(160, W * 0.4);
    const distBarH = Math.min(10, H * 0.025);
    const distBarX = (W - distBarW) / 2;
    const distBarY = H - 50;

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    roundRect(ctx, distBarX - 1, distBarY - 1, distBarW + 2, distBarH + 2, 4);
    ctx.fill();

    const distProgress = 1 - (distance / FISHING_CONFIG.START_DISTANCE);
    let distGrd = ctx.createLinearGradient(distBarX, 0, distBarX + distBarW, 0);
    distGrd.addColorStop(0, '#4488ff');
    distGrd.addColorStop(1, '#44ffaa');
    ctx.fillStyle = distGrd;
    roundRect(ctx, distBarX, distBarY, distProgress * distBarW, distBarH, 3);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = `bold ${Math.min(20, W * 0.05)}px Poppins, Arial`;
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.fillText(`${distance.toFixed(2)} m`, W * 0.5, distBarY - 10);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `${Math.min(11, W * 0.028)}px Poppins, Arial`;
    ctx.fillText('Attālums līdz zivij', W * 0.5, distBarY + distBarH + 16);
    ctx.textAlign = 'start';
}

function roundRect(ctx, x, y, w, h, r) {
    if (w < 0) w = 0;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function finishFishing(success) {
    fishingActive = false;
    cleanupFishingListeners();
    const container = document.querySelector('.task-section');
    const elapsed = ((Date.now() - fishingStartTime) / 1000).toFixed(1);

    if (success) {
        let points = FISHING_CONFIG.NORMAL_POINTS;
        if (elapsed < FISHING_CONFIG.EXCELLENT_TIME) {
            points = FISHING_CONFIG.EXCELLENT_POINTS;
        } else if (elapsed < FISHING_CONFIG.GOOD_TIME) {
            points = FISHING_CONFIG.GOOD_POINTS;
        }
        const newScore = GameState.addScore(points);
        document.getElementById('score-display').innerText = 'Punkti: ' + newScore;

        container.innerHTML = `
            <div style="text-align:center;">
                <h2 style="color:#44ff88;">🐟 Zivs noķerta!</h2>
                <p>Laiks: ${elapsed} s</p>
                <p style="color:#ffaa00; font-size:20px; font-weight:bold;">+${points} punkti!</p>
                <button class="btn btn-full" onclick="closeFishingGame()">Turpināt</button>
            </div>`;
    } else {
        container.innerHTML = `
            <div style="text-align:center;">
                <h2 style="color:#ff6666;">💥 Aukla pārtrūka!</h2>
                <p style="opacity:0.7;">Centies kontrolēt spriegumu — netur pogu pārāk ilgi!</p>
                <button class="btn btn-full" onclick="startFishingGame()">Mēģināt vēlreiz</button>
            </div>`;
    }
}

function closeFishingGame() {
    if (!_ac.activeTask || _ac.taskType !== 'Mols') {
        _ac.addViolation();
        showNotification('Aizdomīga darbība!', 'error', 3000);
        return;
    }
    _ac.activeTask = false;
    _ac.taskType = null;
    _taskCompletionLog.push({ task: 'Mols', time: Date.now() });
    fishingActive = false;
    cleanupFishingListeners();
    document.getElementById('game-modal').style.display = 'none';
    GameState.completeTask();
    updateMapState();
    if (GameState.getCompleted() === TOTAL_TASKS) showEndGame();
}

window.initFishingLogic = initFishingLogic;

window.startFishingGame = startFishingGame;
window.closeFishingGame = closeFishingGame;
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
window.showTheory = showTheory;
window.closeQuizAndContinue = closeQuizAndContinue;
window.initBoatRace = initBoatRace;
window.closeBoatGame = closeBoatGame;
window.initAntGame = initAntGame;
window.closeAntGame = closeAntGame;
window.startHistorySequence = startHistorySequence;
window.checkHistorySequence = checkHistorySequence;
window.closeHistoryGame = closeHistoryGame;
window.sendReady = sendReady;
window.sendLobbyReady = sendLobbyReady;
window.checkMini = checkMini;
window.toggleAnimations = toggleAnimations;
})(); 