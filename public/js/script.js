// --- 1. GLOBĀLIE MAINĪGIE ---
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
let gameQuestions = {};
let boatGameRunning = false;
let finalTestActive = false;
let currentTheme = localStorage.getItem('theme') || 'default';

const taskSequence = [
    'RTU', 'Dzintars', 'Teatris', 'Kanals', 'Osta', 
    'LSEZ', 'Cietums', 'Mols', 'Ezerkrasts', 'Parks'
];

// Statiskie teksti
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

// --- 2. IELĀDE ---

document.addEventListener('DOMContentLoaded', async () => {
    getQueryParams();
    startTime = Date.now();
    
    // Ielādē jautājumus
    await loadQuestions();

    // WebSockets pieslēgums
    connectWebSocket();

    // Tulkošana ielādējot
    if(currentLang !== 'lv') {
        translateInterface(currentLang);
    }
    
    applyTheme(currentTheme);

    if(document.querySelector('.point')) updateMapState();

    // Tooltipi
    const tooltip = document.getElementById('tooltip');
    if (tooltip) {
        document.querySelectorAll('.point').forEach(p => {
            p.addEventListener('mouseover', (e) => {
                const name = p.getAttribute('data-name');
                tooltip.innerText = name;
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

    // Skaņas
    const music = document.getElementById('bg-music');
    if (music) {
        music.volume = 0.3;
        const playAudio = () => {
            music.play().catch(() => {});
            document.removeEventListener('click', playAudio);
        };
        document.addEventListener('click', playAudio);
    }
    
    // ESC bloķēšana jautājuma laikā
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.getElementById('game-modal') && document.getElementById('game-modal').style.display === 'block') {
            e.preventDefault();
        }
    });
});

async function loadQuestions() {
    try {
        const response = await fetch('data/questions.json');
        gameQuestions = await response.json();
    } catch (e) {
        console.error("Nevarēja ielādēt jautājumus:", e);
        // Fallback jautājumi
        gameQuestions = {
            'RTU': [{ q: "Kurā gadā dibināta Liepājas akadēmija?", a: "1954", fact: "Šeit mācās gudrākie prāti!" }]
        };
    }
}

// --- 3. WEBSOCKET FUNKCIJAS ---

function connectWebSocket() {
    // Port 8080 might be blocked or not available in production, use relative or env-based in real world
    ws = new WebSocket('ws://' + window.location.hostname + ':8080');
    
    ws.onopen = () => console.log("WebSocket savienots!");
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'created') {
            myLobbyCode = data.code;
            document.getElementById('lobby-code').innerText = myLobbyCode;
            toggleModal('mode-modal');
            setTimeout(() => { toggleModal('lobby-modal'); }, 100);
        }
        else if (data.type === 'start_game') {
            myRole = data.role;
            alert("Spēle sākas! Tava loma: " + myRole);
            location.href = `map.html?mode=multi&role=${myRole}&code=${myLobbyCode}&name=${encodeURIComponent(globalName)}`;
        }
        else if (data.type === 'sync_complete') {
            const partnerStatus = document.getElementById('partner-status');
            if (partnerStatus) partnerStatus.innerText = "Partneris gatavs!";
            setTimeout(() => { 
                if (currentTask === 'Osta') startCanvasBoatGame();
                else if (currentTask === 'Teatris') startHistorySequence();
                else showQuiz(currentTask); 
            }, 1000);
        }
        else if (data.type === 'error') {
            alert(data.msg);
        }
    };
    
    ws.onerror = (err) => console.error("WS Kļūda:", err);
}

// --- 4. DEEPL TULKOŠANA ---

async function translateText(text, targetLang) {
    try {
        const response = await fetch(`php/translate.php?text=${encodeURIComponent(text)}&target=${targetLang}`);
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
    location.reload();
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
    if (!name) { alert("Lūdzu ievadi Vārdu!"); return null; }
    if (name.length > 15) name = name.substring(0, 15);
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
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'create' }));
    } else {
        alert("Serveris nav pieejams!");
    }
}

function joinGame() {
    const name = validateName(); 
    if (!name) return;
    globalName = name;
    const codeInput = document.getElementById('join-code').value;

    if (ws && ws.readyState === WebSocket.OPEN) {
        myLobbyCode = codeInput;
        ws.send(JSON.stringify({ action: 'join', code: codeInput }));
    } else {
        alert("Serveris nav pieejams!");
    }
}

// --- 6. SPĒLES LOĢIKA ---

function updateMapState() {
    const points = document.querySelectorAll('.point');
    points.forEach(point => {
        const onclickAttr = point.getAttribute('onclick');
        if (!onclickAttr) return;
        const match = onclickAttr.match(/'([^']+)'/);
        if (!match) return;
        const type = match[1];
        const sequenceIndex = taskSequence.indexOf(type);
        
        point.className = point.className.replace(/\b(active-point|inactive-point)\b/g, "");
        if (sequenceIndex < completedTasks) {
            point.classList.add('inactive-point'); 
            point.style.backgroundColor = "#555"; 
            point.style.pointerEvents = "none";
        } else if (sequenceIndex === completedTasks) {
            point.classList.add('active-point'); 
            point.style.pointerEvents = "auto";
            point.style.backgroundColor = ""; // Reset to CSS default
        } else {
            point.classList.add('inactive-point');
            point.style.pointerEvents = "none";
        }
    });
}

function startActivity(type) {
    if (type !== taskSequence[completedTasks]) { 
        alert("Lūdzu dodies uz nākamo punktu secīgi!"); 
        return; 
    }
    currentTask = type;
    
    if (myRole && myLobbyCode) {
        showMiniGame(type);
    } else {
        if (type === 'Osta') startCanvasBoatGame();
        else if (type === 'Teatris') startHistorySequence();
        else showQuiz(type);
    }
}

// --- 7. MINI SPĒLES (HISTORY & BOAT) ---

function startHistorySequence() {
    document.getElementById('game-modal').style.display = 'block';
    const events = [...gameQuestions.historyEvents];
    const shuffled = events.sort(() => Math.random() - 0.5);

    const section = document.querySelector('.task-section');
    section.innerHTML = `
        <h2 style="color:#ffaa00;">Vēsturiskā secība</h2>
        <p>Sakārto notikumus hronoloģiskā secībā (no senākā uz jaunāko)!</p>
        <div id="history-slots" style="display: flex; flex-direction: column; gap: 8px; margin: 15px 0;">
            ${shuffled.map((ev, i) => `
                <div class="history-item" onclick="moveHistoryUp(this)" data-year="${ev.year}"
                     style="background: rgba(0,0,0,0.3); border: 2px solid #ffaa00; border-radius: 8px; padding: 12px; cursor: pointer; user-select: none; display: flex; align-items: center; gap: 10px;">
                    <span class="history-idx" style="color: #ffaa00; font-weight: bold; font-size: 18px;">${i + 1}.</span>
                    <span>${ev.text}</span>
                </div>
            `).join('')}
        </div>
        <button class="btn" style="width:100%;" onclick="checkHistorySequence()">Iesniegt</button>
    `;
}

function moveHistoryUp(el) {
    const container = document.getElementById('history-slots');
    const items = Array.from(container.children);
    const idx = items.indexOf(el);
    if (idx > 0) {
        container.insertBefore(el, items[idx - 1]);
        // Update numbers
        Array.from(container.children).forEach((child, i) => {
            child.querySelector('.history-idx').innerText = (i + 1) + ".";
        });
    }
}

function checkHistorySequence() {
    const items = document.querySelectorAll('.history-item');
    const years = Array.from(items).map(item => parseInt(item.getAttribute('data-year')));
    const isCorrect = years.every((year, i) => i === 0 || year >= years[i - 1]);

    if (isCorrect) {
        score += 10;
        alert("Pareizi! +10 punkti.");
        closeActivity();
    } else {
        if(score > 0) score -= 5;
        alert("Nepareizi! Pamēģini vēlreiz. -5 punkti.");
        updateScoreDisplay();
    }
}

function startCanvasBoatGame() {
    document.getElementById('game-modal').style.display = 'block';
    const section = document.querySelector('.task-section');
    section.innerHTML = `
        <h2 style="color:#ffaa00;">Ostas regate</h2>
        <p>Sasniegsim Liepājas ostu! Izmanto W/A/S/D lai vadītu laivu.</p>
        <div class="boat-canvas-container">
            <canvas id="boatCanvas"></canvas>
            <div id="boat-timer" style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.7); padding:5px 10px; border-radius:5px; color:yellow;">0.0s</div>
        </div>
        <p style="font-size:12px; margin-top:5px;">Mērķis: Brauc uz ziemeļiem (augšu)!</p>
    `;

    initBoatPhysics();
}

function initBoatPhysics() {
    const canvas = document.getElementById('boatCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    const boatImg = new Image(); boatImg.src = 'atteli/boat.png';
    const bgImg = new Image(); bgImg.src = 'atteli/udens.png';

    let boat = { x: canvas.width/2, y: canvas.height - 50, angle: 0, speed: 0 };
    let keys = {};
    let bTimeStart = Date.now();
    boatGameRunning = true;

    const keydown = (e) => keys[e.key.toLowerCase()] = true;
    const keyup = (e) => keys[e.key.toLowerCase()] = false;
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    function loop() {
        if(!boatGameRunning) {
            window.removeEventListener('keydown', keydown);
            window.removeEventListener('keyup', keyup);
            return;
        }

        // Physics
        if(keys['w']) boat.speed += 0.1;
        if(keys['s']) boat.speed -= 0.1;
        if(keys['a']) boat.angle -= 0.05;
        if(keys['d']) boat.angle += 0.05;
        boat.speed *= 0.98;
        boat.x += Math.sin(boat.angle) * boat.speed;
        boat.y -= Math.cos(boat.angle) * boat.speed;

        // Draw
        ctx.fillStyle = "#004488";
        ctx.fillRect(0,0,canvas.width, canvas.height);
        if(bgImg.complete) {
            ctx.drawImage(bgImg, -boat.x/2, -boat.y/2, 2000, 2000);
        }

        ctx.save();
        ctx.translate(canvas.width/2, canvas.height/2);
        // Map boat to center of screen relative view
        ctx.rotate(boat.angle);
        if(boatImg.complete) ctx.drawImage(boatImg, -15, -30, 30, 60);
        ctx.restore();

        const curTime = ((Date.now() - bTimeStart)/1000).toFixed(1);
        document.getElementById('boat-timer').innerText = curTime + "s";

        // Win condition
        if(boat.y < -500) {
            boatGameRunning = false;
            score += 10;
            alert(`Finišs! Laiks: ${curTime}s. +10 punkti.`);
            closeActivity();
        } else {
            requestAnimationFrame(loop);
        }
    }
    loop();
}

function closeActivity() {
    document.getElementById('game-modal').style.display = 'none';
    completedTasks++;
    updateMapState();
    updateScoreDisplay();
    if(completedTasks === 10) setTimeout(showFinalTest, 500);
}

function updateScoreDisplay() {
    const el = document.getElementById('score-display');
    if(el) el.innerText = "Punkti: " + score;
}

// --- 8. NOSLĒGUMA TESTS ---

function showFinalTest() {
    document.getElementById('game-modal').style.display = 'block';
    const section = document.querySelector('.task-section');
    section.innerHTML = `
        <h2 style="color:#ffaa00;">Ekskursija pabeigta!</h2>
        <p>Vai esi gatavs noslēguma testam par Liepāju? Par katru pareizu atbildi saņemsi +1 bonusa punktu!</p>
        <button class="btn" style="width:100%; margin-top:20px;" onclick="startFinalQuiz()">Sākt testu</button>
    `;
}

let finalQIdx = 0;
let finalQuizScore = 0;

function startFinalQuiz() {
    finalQIdx = 0;
    finalQuizScore = 0;
    showFinalQuestion();
}

function showFinalQuestion() {
    const q = gameQuestions.finalQuestions[finalQIdx];
    const section = document.querySelector('.task-section');
    const colors = ['#e21b3c', '#1368ce', '#d89e00', '#26890c'];
    
    section.innerHTML = `
        <h3>Jautājums ${finalQIdx + 1}/5</h3>
        <p style="font-size: 18px; margin-bottom: 20px;">${q.q}</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            ${q.options.map((opt, i) => `
                <button class="kahoot-option" style="background:${colors[i]}" onclick="handleFinalAnswer(${i})">
                    ${opt}
                </button>
            `).join('')}
        </div>
    `;
}

function handleFinalAnswer(idx) {
    const q = gameQuestions.finalQuestions[finalQIdx];
    if(idx === q.correct) finalQuizScore++;
    
    finalQIdx++;
    if(finalQIdx < gameQuestions.finalQuestions.length) {
        showFinalQuestion();
    } else {
        score += finalQuizScore;
        alert(`Tests pabeigts! Tu ieguvi ${finalQuizScore} bonusa punktus.`);
        showEndGame();
    }
}

// --- 9. CITI (THEMES) ---

function applyTheme(theme) {
    document.body.className = theme === 'default' ? '' : 'theme-' + theme;
    currentTheme = theme;
    localStorage.setItem('theme', theme);
}


function showMiniGame(type) {
    document.getElementById('game-modal').style.display = "block";
    const content = document.querySelector('.task-section');
    
    if (type === 'Cietums') {
        const code = myRole === 'host' ? "4 2 _ _" : "_ _ 9 1";
        content.innerHTML = `<h2>Cietums</h2><p>Ievadiet pilno kodu kopā ar partneri!</p><p>Tava daļa: ${code}</p><input id="mini-input" placeholder="4 cipari"><button class="btn" onclick="checkMini('4291')">OK</button>`;
    } else {
        content.innerHTML = `<h2>Gatavs?</h2><button class="btn" onclick="sendReady()">JĀ, ESAM GATAVI</button><p id="partner-status" style="display:none">Gaidu partneri...</p>`;
    }
}

function checkMini(ans) {
    const input = document.getElementById('mini-input');
    if(input && input.value === ans) {
        sendReady();
    } else {
        alert("Nepareizs kods!");
    }
}

function sendReady() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: 'update_task', code: myLobbyCode, role: myRole }));
        document.querySelector('.task-section').innerHTML = "<h2>Gaidam partneri...</h2><div class='loader'></div>";
    }
}

async function showQuiz(type) {
    document.getElementById('game-modal').style.display = "block";
    const locationQuestions = gameQuestions[type] || [];
    const task = locationQuestions[Math.floor(Math.random() * locationQuestions.length)] || { q: "Jautājums nav atrasts", a: "" };
    
    let q = task.q;
    if(currentLang !== 'lv') q = await translateText(q, currentLang.toUpperCase());

    const section = document.querySelector('.task-section');
    section.innerHTML = `
        <h2>${type}</h2>
        <p id="quiz-question">${q}</p>
        <input id="ans-in" placeholder="Tava atbilde">
        <button class="btn" onclick="checkAns('${task.a.replace(/'/g, "\\'")}')">Iesniegt</button>
    `;
}

function checkAns(correct) {
    const val = document.getElementById('ans-in').value;
    if(val.toLowerCase().trim() === correct.toLowerCase().trim()) {
        score += 10;
        alert("Pareizi! +10 punkti.");
    } else {
        if(score > 0) score -= 5;
        alert("Nepareizi! Pareizā atbilde: " + correct);
    }
    const scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) scoreDisplay.innerText = "Punkti: " + score;
    
    document.getElementById('game-modal').style.display = 'none';
    completedTasks++;
    updateMapState();
    if(completedTasks === 10) showEndGame();
}

function showEndGame() { 
    const totalTimeMs = Date.now() - startTime;
    const minutes = Math.floor(totalTimeMs / 60000);
    const seconds = Math.floor((totalTimeMs % 60000) / 1000);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    alert(`Spēle beigusies! Tavs rezultāts: ${score} punkti, Laiks: ${timeStr}`);
    finishGame(globalName, score, timeStr); 
}

async function finishGame(n, s, t) { 
    try {
        await fetch('php/save_score.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: n, score: s, time: t })
        });
    } catch (e) {
        console.error("Nevarēja saglabāt rezultātu:", e);
    }
    location.href = 'php/leaderboard.php'; 
}

function toggleModal(id) { 
    const el = document.getElementById(id);
    if (el) el.style.display = el.style.display === "block" ? "none" : "block"; 
}

function exitGame() { 
    if (confirm("Vai tiešām vēlaties iziet?")) window.location.href = "about:blank"; 
}

function setMusicVolume(v) { 
    const music = document.getElementById('bg-music');
    if (music) music.volume = v / 100; 
}

function setSFXVolume(v) { 
    const sfx = document.getElementById('hover-sound');
    if (sfx) sfx.volume = v / 100; 
}