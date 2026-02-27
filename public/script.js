// --- GLOBĀLIE MAINĪGIE ---
const state = {
    scoreCapByActivity: {},
    route: [],
    locations: [],
    locationsById: {},
    finalLocationId: 'Atputa',
    completedCount: 0,
    currentTask: '',
    currentLang: localStorage.getItem('lang') || 'lv',
    startTime: null,
    playerId: '',
    playerName: '',
    role: '',
    lobbyCode: '',
    mode: 'single',
    lobbyInterval: null,
    gameSyncInterval: null,
    finalTestQuestions: [],
    finalTestOrder: [],
    finalTestIndex: 0,
    finalTestScore: 0,
    sfxVolume: parseFloat(localStorage.getItem('sfxVolume') || '0.4'),
    musicVolume: parseFloat(localStorage.getItem('musicVolume') || '0.4'),
    isReady: false
};

const translations = {
    lv: {
        "answer-input": "Tava atbilde...",
        "btn-submit": "Iesniegt",
        "score-label": "Punkti: ",
        "alert-name": "Lūdzu ievadi vārdu!",
        "alert-saved": "Rezultāts saglabāts!",
        "alert-error": "Kļūda saglabājot: ",
        "alert-exit": "Vai tiešām vēlies iziet?",
        "alert-bad-code": "Nepareizs kods vai istaba pilna",
        "route-wrong": "Lūdzu pildi uzdevumus secībā! Meklē punktu, kas mirgo.",
        "name-invalid": "Vārdam jābūt 2-16 zīmēm un jāsatur tikai burti, cipari vai atstarpes."
    },
    en: {
        "answer-input": "Your answer...",
        "btn-submit": "Submit",
        "score-label": "Score: ",
        "alert-name": "Please enter your name!",
        "alert-saved": "Result saved!",
        "alert-error": "Error saving: ",
        "alert-exit": "Do you really want to exit?",
        "alert-bad-code": "Invalid code or room full",
        "route-wrong": "Please follow the route order. Look for the blinking point.",
        "name-invalid": "Name must be 2-16 characters with letters, numbers, or spaces."
    }
};

// --- PAMATFUNKCIJAS ---
function isGameModalOpen() {
    const modal = document.getElementById('game-modal');
    return modal && modal.style.display === 'block';
}

function isAnyModalOpen() {
    return document.querySelector('.modal[style*="display: block"]') !== null;
}

function shuffle(array) {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function getPlayerId() {
    let id = localStorage.getItem('playerId');
    if (!id) {
        id = `p${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem('playerId', id);
    }
    return id;
}

function setScoreDisplay() {
    const scoreDisplay = document.getElementById('score-display');
    if (!scoreDisplay) return;
    const t = translations[state.currentLang];
    scoreDisplay.innerText = t['score-label'] + GameScore.getTotal();
}

function setProgressDisplay() {
    const el = document.getElementById('progress-display');
    if (!el) return;
    el.innerText = `Maršruts: ${state.completedCount}/${state.route.length}`;
}

function setLanguage(lang) {
    state.currentLang = lang;
    localStorage.setItem('lang', lang);
}

function setMusicVolume(value) {
    const val = parseFloat(value) / 100;
    state.musicVolume = val;
    localStorage.setItem('musicVolume', val.toString());
    const music = document.getElementById('bg-music');
    if (music) music.volume = val;
}

function setSFXVolume(value) {
    const val = parseFloat(value) / 100;
    state.sfxVolume = val;
    localStorage.setItem('sfxVolume', val.toString());
    if (window.MinigameManager) window.MinigameManager.setVolume(val);
}

// --- INIT ---
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    state.role = params.get('role') || '';
    state.lobbyCode = params.get('code') || '';
    state.mode = params.get('mode') || 'single';
}

document.addEventListener('DOMContentLoaded', () => {
    getQueryParams();
    state.playerId = getPlayerId();
    state.startTime = Date.now();

    if (document.getElementById('main-menu')) {
        initMainMenu();
    }

    if (document.querySelector('.map-container')) {
        initMap();
    }

    document.addEventListener('keydown', (e) => {
        if (isAnyModalOpen()) return;
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach((m) => (m.style.display = 'none'));
        }
    });
});

// --- MAIN MENU ---
function initMainMenu() {
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) {
        nameInput.value = localStorage.getItem('playerName') || '';
    }

    if (localStorage.getItem('lang') === 'en') setLanguage('en');

    const music = document.getElementById('bg-music');
    if (music) {
        music.volume = state.musicVolume;
        document.addEventListener('click', () => music.play(), { once: true });
    }

    const ranges = document.querySelectorAll('input[type=range]');
    if (ranges[0]) ranges[0].value = Math.round(state.musicVolume * 100);
    if (ranges[1]) ranges[1].value = Math.round(state.sfxVolume * 100);
}

function validateName(name) {
    const clean = name.trim().replace(/\s+/g, ' ');
    if (clean.length < 2 || clean.length > 16) return '';
    if (!/^[\p{L}0-9 \-]+$/u.test(clean)) return '';
    return clean;
}

function openLobby() {
    const nameInput = document.getElementById('player-name-input');
    const name = validateName(nameInput ? nameInput.value : '');
    if (!name) {
        alert(translations[state.currentLang]['name-invalid']);
        return;
    }
    localStorage.setItem('playerName', name);
    state.playerName = name;

    fetch(`lobby.php?action=create&name=${encodeURIComponent(name)}&playerId=${state.playerId}`)
        .then((response) => response.json())
        .then((data) => {
            if (data.status === 'success') {
                state.role = 'host';
                state.lobbyCode = data.code;
                document.getElementById('lobby-code').innerText = data.code;
                toggleModal('mode-modal');
                setTimeout(() => toggleModal('lobby-modal'), 100);
                startLobbyPolling(data.code);
            } else {
                alert('Kļūda veidojot istabu.');
            }
        });
}

function joinGame() {
    const codeInput = document.getElementById('join-code').value.trim();
    const nameInput = document.getElementById('player-name-input');
    const name = validateName(nameInput ? nameInput.value : '');

    if (!name) {
        alert(translations[state.currentLang]['name-invalid']);
        return;
    }

    if (codeInput.length === 4 && !isNaN(codeInput)) {
        localStorage.setItem('playerName', name);
        state.playerName = name;
        fetch(`lobby.php?action=join&code=${codeInput}&name=${encodeURIComponent(name)}&playerId=${state.playerId}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.status === 'success') {
                    state.role = 'guest';
                    state.lobbyCode = codeInput;
                    alert('Veiksmīgi pievienojies!');
                    toggleModal('mode-modal');
                    setTimeout(() => toggleModal('lobby-modal'), 100);
                    document.getElementById('lobby-code').innerText = codeInput;
                    startLobbyPolling(codeInput);
                } else {
                    alert(translations[state.currentLang]['alert-bad-code']);
                }
            });
    } else {
        alert(translations[state.currentLang]['alert-bad-code']);
    }
}

function startLobbyPolling(code) {
    if (state.lobbyInterval) clearInterval(state.lobbyInterval);
    state.lobbyInterval = setInterval(() => {
        fetch(`lobby.php?action=get_lobby&code=${code}&playerId=${state.playerId}`)
            .then((response) => response.json())
            .then((data) => {
                if (!data || data.status === 'error') return;
                updateLobbyUI(data);
                if (data.status === 'in_game') {
                    clearInterval(state.lobbyInterval);
                    location.href = `map.html?mode=multi&role=${state.role}&code=${code}`;
                }
            });
    }, 1500);
}

function updateLobbyUI(data) {
    const playersDiv = document.getElementById('lobby-players');
    const status = document.getElementById('lobby-status');
    const startBtn = document.getElementById('btn-start-game');
    const readyBtn = document.getElementById('btn-ready');

    if (!playersDiv || !status || !startBtn) return;

    const host = data.players.host;
    const guest = data.players.guest;
    playersDiv.innerHTML = `
        <div>Host: ${host.name || '---'} ${host.ready ? '(gatavs)' : '(nav gatavs)'}</div>
        <div>Viesis: ${guest.name || '---'} ${guest.ready ? '(gatavs)' : '(nav gatavs)'}</div>
    `;

    const allReady = host.ready && guest.ready && host.name && guest.name;
    status.innerText = allReady ? 'Abi gatavi, var startēt.' : 'Gaidu otru spēlētāju...';
    startBtn.disabled = !(allReady && state.role === 'host');

    if (readyBtn) {
        const isReady = state.role === 'host' ? host.ready : guest.ready;
        state.isReady = isReady;
        readyBtn.innerText = isReady ? 'Gatavs' : 'Nav gatavs';
    }
}

function toggleReady() {
    state.isReady = !state.isReady;
    const btn = document.getElementById('btn-ready');
    if (btn) btn.innerText = state.isReady ? 'Gatavs' : 'Nav gatavs';
    fetch(`lobby.php?action=set_ready&code=${state.lobbyCode}&playerId=${state.playerId}&ready=${state.isReady}`)
        .then(() => {});
}

function startMultiplayer() {
    fetch(`lobby.php?action=start_game&code=${state.lobbyCode}`)
        .then((response) => response.json())
        .then((data) => {
            if (data.status === 'success') {
                location.href = `map.html?mode=multi&role=host&code=${state.lobbyCode}`;
            } else {
                alert('Spēli nevar startēt, kamēr abi nav gatavi.');
            }
        });
}

document.getElementById('btn-close-lobby')?.addEventListener('click', () => {
    if (state.lobbyInterval) clearInterval(state.lobbyInterval);
});

// --- MAP INIT ---
async function initMap() {
    GameScore.reset();
    await loadData();
    initTooltip();
    updateMapState();
    setScoreDisplay();
    setProgressDisplay();

    if (window.MinigameManager) {
        window.MinigameManager.init('phaser-container');
        window.MinigameManager.setVolume(state.sfxVolume);
    }

    window.addEventListener('minigame-complete', (e) => {
        const { activityId, score } = e.detail;
        finalizeTask(activityId, score);
    });

    if (state.mode === 'multi' && state.lobbyCode) {
        startGameSync();
    }
}

function initTooltip() {
    const tooltip = document.getElementById('tooltip');
    document.querySelectorAll('.point').forEach((p) => {
        p.addEventListener('mouseover', (e) => {
            tooltip.innerText = p.getAttribute('data-name');
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.pageX + 15}px`;
            tooltip.style.top = `${e.pageY + 15}px`;
        });
        p.addEventListener('mousemove', (e) => {
            tooltip.style.left = `${e.pageX + 15}px`;
            tooltip.style.top = `${e.pageY + 15}px`;
        });
        p.addEventListener('mouseout', () => {
            tooltip.style.display = 'none';
        });
    });
}

async function loadData() {
    try {
        const [locationsResponse, questionsResponse] = await Promise.all([
            fetch('data/locations.json'),
            fetch('data/questions.json')
        ]);
        const locationsData = await locationsResponse.json();
        const questionsData = await questionsResponse.json();

        state.locations = locationsData.locations || [];
        state.finalLocationId = locationsData.finalLocationId || 'Atputa';
        state.locationsById = state.locations.reduce((acc, loc) => {
            acc[loc.id] = loc;
            state.scoreCapByActivity[loc.id] = loc.scoreCap || 10;
            return acc;
        }, {});

        state.finalTestQuestions = (questionsData.finalTest || []).slice(0, 10);
        initializeRoute();

        document.querySelectorAll('.point').forEach((p) => {
            const id = p.getAttribute('data-id');
            if (state.locationsById[id]) {
                p.setAttribute('data-name', state.locationsById[id].name);
            }
        });
    } catch (err) {
        alert('Neizdevās ielādēt datus.');
    }
}

function initializeRoute() {
    if (state.mode === 'multi' && state.lobbyCode) {
        fetch(`lobby.php?action=get_lobby&code=${state.lobbyCode}&playerId=${state.playerId}`)
            .then((response) => response.json())
            .then((data) => {
                if (!data || data.status === 'error') return;
                if (state.role === 'host' && (!data.route || data.route.length === 0)) {
                    const route = generateRoute();
                    state.route = route;
                    sendRoute(route);
                } else {
                    state.route = data.route && data.route.length ? data.route : [];
                }
                state.completedCount = data.progressIndex || 0;
                if (data.start_time) {
                    state.startTime = data.start_time * 1000;
                }
                updateMapState();
                setProgressDisplay();
            });
        return;
    }

    const stored = sessionStorage.getItem('routeOrder');
    if (stored) {
        state.route = JSON.parse(stored);
    } else {
        state.route = generateRoute();
        sessionStorage.setItem('routeOrder', JSON.stringify(state.route));
    }
}

function generateRoute() {
    const ids = state.locations.map((loc) => loc.id).filter((id) => id !== state.finalLocationId);
    const shuffled = shuffle(ids);
    return [...shuffled, state.finalLocationId];
}

function sendRoute(route) {
    fetch(`lobby.php?action=set_route&code=${state.lobbyCode}&route=${encodeURIComponent(JSON.stringify(route))}`);
}

function updateMapState() {
    const points = document.querySelectorAll('.point');

    points.forEach((point) => {
        const type = point.getAttribute('data-id');
        if (!state.route.length) {
            point.style.pointerEvents = 'none';
            point.style.opacity = '0.4';
            point.style.filter = 'grayscale(100%)';
            point.style.animation = 'none';
            return;
        }

        const sequenceIndex = state.route.indexOf(type);

        point.style.pointerEvents = 'none';
        point.style.opacity = '0.4';
        point.style.filter = 'grayscale(100%)';
        point.style.animation = 'none';

        if (sequenceIndex < state.completedCount) {
            point.style.backgroundColor = '#555';
        } else if (sequenceIndex === state.completedCount) {
            point.style.pointerEvents = 'auto';
            point.style.opacity = '1';
            point.style.filter = 'none';
            point.style.animation = 'pulse 2s infinite';
        }
    });
}

// --- SPĒLES DARBĪBAS ---
function startActivity(type) {
    if (!state.route.length) {
        alert('Maršruts vēl tiek sinhronizēts.');
        return;
    }
    const expectedTask = state.route[state.completedCount];
    if (type !== expectedTask) {
        alert(translations[state.currentLang]['route-wrong']);
        return;
    }

    state.currentTask = type;
    const location = state.locationsById[type];
    if (!location) return;

    if (location.activityType.startsWith('minigame_')) {
        showMinigame(type, location.activityType);
    } else if (location.activityType === 'final_test') {
        startFinalTest(type);
    } else {
        showPuzzle(type, location.activityType);
    }
}

function showModal() {
    const modal = document.getElementById('game-modal');
    if (modal) modal.style.display = 'block';
}

function showPuzzle(activityId, puzzleType) {
    showModal();
    const taskSection = document.querySelector('.task-section');
    const phaserContainer = document.getElementById('phaser-container');
    const guideWrapper = document.querySelector('.guide-wrapper');
    const guideHint = document.getElementById('guide-hint');
    if (phaserContainer) phaserContainer.style.display = 'none';
    if (taskSection) taskSection.style.display = 'block';
    if (guideWrapper) guideWrapper.style.display = 'block';

    const puzzles = {
        puzzle_kanals: {
            title: 'Kanāla loģistika',
            question: 'Atzīmē, kas savieno Liepājas ezeru ar jūru.',
            options: ['Tirdzniecības kanāls', 'Daugava', 'Abava'],
            correctIndex: 0
        },
        puzzle_lsez: {
            title: 'LSEZ pārbaude',
            question: 'Kura no izvēlēm vislabāk raksturo LSEZ?',
            options: ['Speciālā ekonomiskā zona', 'Dabas parks', 'Skatu tornis'],
            correctIndex: 0
        },
        puzzle_mols: {
            title: 'Mola mērījums',
            question: 'Izvēlies pareizo Ziemeļu mola garumu.',
            options: ['1800 m', '600 m', '3200 m'],
            correctIndex: 0
        },
        puzzle_ezerkrasts: {
            title: 'Ezerkrasta taka',
            question: 'Pie kura ezera atrodas Ezerkrasta taka?',
            options: ['Liepājas ezers', 'Usmas ezers', 'Burtnieku ezers'],
            correctIndex: 0
        }
    };

    const puzzle = puzzles[puzzleType];
    if (!puzzle || !taskSection) return;

    if (guideHint) guideHint.innerText = 'Izvēlies pareizo atbildi.';

    taskSection.innerHTML = `
        <h2 id="task-title">${puzzle.title}</h2>
        <p id="task-desc">${puzzle.question}</p>
        <div id="puzzle-options"></div>
        <div id="puzzle-feedback" style="margin-top: 10px; color: #ffdd99;"></div>
    `;

    const optionsEl = document.getElementById('puzzle-options');
    puzzle.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.width = '100%';
        btn.style.marginTop = '10px';
        btn.innerText = opt;
        btn.onclick = () => {
            const feedback = document.getElementById('puzzle-feedback');
            if (index === puzzle.correctIndex) {
                if (feedback) feedback.innerText = 'Pareizi!';
                finalizeTask(activityId, state.scoreCapByActivity[activityId] || 10);
            } else {
                if (feedback) feedback.innerText = 'Nepareizi, mēģini vēlreiz.';
            }
        };
        optionsEl.appendChild(btn);
    });
}

function showMinigame(activityId, activityType) {
    showModal();
    const taskSection = document.querySelector('.task-section');
    const phaserContainer = document.getElementById('phaser-container');
    const guideWrapper = document.querySelector('.guide-wrapper');
    if (taskSection) taskSection.style.display = 'none';
    if (phaserContainer) phaserContainer.style.display = 'block';
    if (guideWrapper) guideWrapper.style.display = 'none';

    const sceneMap = {
        minigame_tower: 'TowerBlocksScene',
        minigame_dzintars: 'DzintarsScene',
        minigame_teatris: 'TeatrisScene',
        minigame_regate: 'RegateScene',
        minigame_cietums: 'CietumsScene'
    };

    const sceneKey = sceneMap[activityType] || 'TowerBlocksScene';
    const cap = state.scoreCapByActivity[activityId] || 10;
    if (window.MinigameManager) {
        window.MinigameManager.start(sceneKey, { activityId, scoreCap: cap });
    }
}

function startFinalTest(activityId) {
    showModal();
    const taskSection = document.querySelector('.task-section');
    const phaserContainer = document.getElementById('phaser-container');
    const guideWrapper = document.querySelector('.guide-wrapper');
    if (phaserContainer) phaserContainer.style.display = 'none';
    if (taskSection) taskSection.style.display = 'block';
    if (guideWrapper) guideWrapper.style.display = 'block';

    state.finalTestOrder = shuffle(state.finalTestQuestions);
    state.finalTestIndex = 0;
    state.finalTestScore = 0;

    renderFinalQuestion(activityId);
}

function renderFinalQuestion(activityId) {
    const taskSection = document.querySelector('.task-section');
    if (!taskSection) return;

    const question = state.finalTestOrder[state.finalTestIndex];
    if (!question) {
        finalizeTask(activityId, state.finalTestScore);
        return;
    }

    const shuffledChoices = shuffle(question.choices.map((choice, index) => ({
        choice,
        originalIndex: index
    })));

    taskSection.innerHTML = `
        <h2>Fināla tests</h2>
        <p>Jautājums ${state.finalTestIndex + 1}/10</p>
        <p>${question.question}</p>
        <div id="final-options"></div>
        <div id="final-feedback" style="margin-top: 10px; color: #ffdd99;"></div>
    `;

    const optionsEl = document.getElementById('final-options');
    shuffledChoices.forEach((item) => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.width = '100%';
        btn.style.marginTop = '10px';
        btn.innerText = item.choice;
        btn.onclick = () => {
            if (item.originalIndex === question.correctIndex) {
                state.finalTestScore += 1;
                document.getElementById('final-feedback').innerText = 'Pareizi.';
            } else {
                document.getElementById('final-feedback').innerText = 'Nepareizi.';
            }
            state.finalTestIndex += 1;
            setTimeout(() => renderFinalQuestion(activityId), 400);
        };
        optionsEl.appendChild(btn);
    });
}

function finalizeTask(activityId, scoreDelta) {
    const cap = state.scoreCapByActivity[activityId] || 10;
    const result = GameScore.add(activityId, scoreDelta, cap);
    const appliedScore = result.applied;
    setScoreDisplay();

    if (state.mode === 'multi' && state.lobbyCode) {
        completeTaskMultiplayer(activityId, appliedScore);
        return;
    }

    state.completedCount += 1;
    closeGameModal();
    updateMapState();
    setProgressDisplay();

    if (state.completedCount === state.route.length) {
        showEndGame();
    }
}

function closeGameModal() {
    const modal = document.getElementById('game-modal');
    if (modal) modal.style.display = 'none';
}

// --- MULTIPLAYER SYNC ---
function startGameSync() {
    if (state.gameSyncInterval) clearInterval(state.gameSyncInterval);
    state.gameSyncInterval = setInterval(() => {
        fetch(`lobby.php?action=get_state&code=${state.lobbyCode}`)
            .then((response) => response.json())
            .then((data) => {
                if (!data) return;
                if (data.route && data.route.length) {
                    state.route = data.route;
                }
                if (typeof data.progressIndex === 'number') {
                    state.completedCount = data.progressIndex;
                    updateMapState();
                    setProgressDisplay();
                }
                if (data.start_time) {
                    state.startTime = data.start_time * 1000;
                }
            });
    }, 1500);
}

function completeTaskMultiplayer(activityId, scoreDelta) {
    fetch(`lobby.php?action=complete_task&code=${state.lobbyCode}&playerId=${state.playerId}&score=${scoreDelta}`)
        .then((response) => response.json())
        .then((data) => {
            if (!data || data.status !== 'success') return;
            state.completedCount = data.progressIndex;
            closeGameModal();
            updateMapState();
            setProgressDisplay();

            if (state.completedCount === state.route.length) {
                if (state.role === 'host') {
                    showEndGame(data.scores);
                } else {
                    showEndGame(data.scores, true);
                }
            }
        });
}

// --- BEIGU EKRĀNS ---
function showEndGame(multiScores = null, isGuest = false) {
    const finalScoreElem = document.getElementById('final-score');
    const endPoints = document.getElementById('end-points');
    const endModal = document.getElementById('end-modal');
    const nameInput = document.getElementById('player-name');
    const endMultiInfo = document.getElementById('end-multi-info');
    const saveBtn = document.getElementById('btn-save');

    const endTime = Date.now();
    const durationMs = endTime - state.startTime;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const formattedTime = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    if (finalScoreElem) finalScoreElem.innerText = GameScore.getTotal();
    if (endPoints) endPoints.innerText = ` punkti. Laiks: ${formattedTime}`;

    if (multiScores) {
        const teamScore = (multiScores.host || 0) + (multiScores.guest || 0);
        if (finalScoreElem) finalScoreElem.innerText = teamScore;
        if (endMultiInfo) {
            endMultiInfo.style.display = 'block';
            endMultiInfo.innerText = `Komandas punkti: ${teamScore}`;
        }
        if (nameInput) nameInput.style.display = 'none';
        if (saveBtn) saveBtn.style.display = 'none';
        if (!isGuest && state.role === 'host') {
            submitMultiplayerResult(teamScore, formattedTime);
        }
    } else {
        if (endMultiInfo) endMultiInfo.style.display = 'none';
        if (nameInput) nameInput.style.display = 'block';
        if (saveBtn) saveBtn.style.display = 'inline-block';
    }

    if (endModal) endModal.style.display = 'block';
    window.finalTimeStr = formattedTime;
}

function submitMultiplayerResult(teamScore, timeStr) {
    fetch(`lobby.php?action=get_lobby&code=${state.lobbyCode}&playerId=${state.playerId}`)
        .then((response) => response.json())
        .then((data) => {
            const hostName = data.players.host.name || 'Spēlētājs 1';
            const guestName = data.players.guest.name || 'Spēlētājs 2';
            const players = `${hostName} + ${guestName}`;
            finishGame(null, teamScore, timeStr, 'multi', players);
        });
}

function submitResult() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput ? nameInput.value.trim() : '';
    const t = translations[state.currentLang];

    if (!name) {
        alert(t['alert-name']);
        return;
    }

    finishGame(name, GameScore.getTotal(), window.finalTimeStr, 'single', null);
}

function finishGame(playerName, finalScore, finalTime, mode, players) {
    const t = translations[state.currentLang];
    let url = `save_score.php?mode=${mode}&score=${finalScore}&time=${encodeURIComponent(finalTime)}`;

    if (mode === 'multi' && players) {
        url += `&players=${encodeURIComponent(players)}`;
    } else {
        url += `&name=${encodeURIComponent(playerName)}`;
    }

    fetch(url)
        .then((response) => response.text())
        .then((data) => {
            if (data.trim() === 'Success') {
                alert(t['alert-saved']);
                location.href = 'leaderboard.php';
            } else {
                alert(t['alert-error'] + data);
            }
        })
        .catch(() => {
            alert('Tīkla kļūda.');
        });
}

// --- MENU UN MODALI ---
function toggleModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        document.querySelectorAll('.modal').forEach((m) => {
            if (m.id !== id) m.style.display = 'none';
        });
        modal.style.display = modal.style.display === 'block' ? 'none' : 'block';
    }
}

function exitGame() {
    const t = translations[state.currentLang];
    if (confirm(t['alert-exit'])) {
        window.close();
        location.href = 'https://google.com';
    }
}
