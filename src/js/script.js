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
let gameSyncInterval = null;
let lobbyInterval = null;

const taskSequence = [
    'RTU', 'Dzintars', 'Teatris', 'Kanals', 'Osta', 
    'LSEZ', 'Cietums', 'Mols', 'Ezerkrasts', 'Parks'
];

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

const translations = {
    lv: {
        "answer-input": "Tava atbilde...",
        "btn-submit": "Iesniegt",
        "alert-correct": "Pareizi! +10 punkti.",
        "alert-wrong": "Nepareizi! -5 punkti.",
        "score-label": "Punkti: ",
        "main-title": "LIEPĀJAS KARTE",
        "subtitle": "EKSKURSIJA",
        "btn-start": "Sākt spēli",
        "btn-settings": "Iestatījumi",
        "btn-leaderboard": "Top 10",
        "btn-about": "Par spēli",
        "btn-exit": "Iziet",
        "mode-title": "Izvēlies režīmu",
        "btn-single": "Spēlēt vienam",
        "btn-lobby": "Spēlēt ar draugu",
        "btn-join": "Pievienoties",
        "btn-cancel-mode": "Atcelt",
        "settings-title": "Iestatījumi",
        "audio-title": "Audio",
        "music-title": "Mūzika",
        "lang-title": "Valoda",
        "btn-close-settings": "Aizvērt",
        "about-title": "Par Spēli",
        "btn-close-about": "Aizvērt",
        "start-player-name": "Tavs Vārds...",
        "join-code": "Ievadi drauga kodu"
    },
    en: {
        "answer-input": "Your answer...",
        "btn-submit": "Submit",
        "alert-correct": "Correct! +10 points.",
        "alert-wrong": "Wrong! -5 points.",
        "score-label": "Score: ",
        "main-title": "LIEPAJA MAP",
        "subtitle": "EXCURSION",
        "btn-start": "Start Game",
        "btn-settings": "Settings",
        "btn-leaderboard": "Leaderboard",
        "btn-about": "About Game",
        "btn-exit": "Exit",
        "mode-title": "Choose Mode",
        "btn-single": "Single Player",
        "btn-lobby": "Play with Friend",
        "btn-join": "Join",
        "btn-cancel-mode": "Cancel",
        "settings-title": "Settings",
        "audio-title": "Audio",
        "music-title": "Music",
        "lang-title": "Language",
        "btn-close-settings": "Close",
        "about-title": "About Game",
        "btn-close-about": "Close",
        "start-player-name": "Your Name...",
        "join-code": "Enter friend's code"
    }
};

// --- 2. IELĀDES FUNKCIJAS ---

document.addEventListener('DOMContentLoaded', () => {
    getQueryParams();
    startTime = Date.now();
    if(localStorage.getItem('lang') === 'en') setLanguage('en');
    
    if(document.querySelector('.point')) {
        updateMapState();
    }

    // Tooltip loģika
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

    // --- POGU HOVER SKAŅA (JAUNS) ---
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('mouseenter', () => {
            const sound = document.getElementById('hover-sound');
            if(sound) {
                sound.currentTime = 0;
                sound.play().catch(() => {});
            }
        });
    });

    // Escape poga
    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") {
            const gameModal = document.getElementById('game-modal');
            if (!gameModal || gameModal.style.display !== "block") {
                 document.querySelectorAll('.modal').forEach(m => m.style.display = "none");
            }
        }
    });

    // Mūzikas ielāde
    const music = document.getElementById('bg-music');
    if (music) {
        music.volume = 0.3;
        const playAudio = () => {
            music.play().catch(() => {});
            document.removeEventListener('click', playAudio);
        };
        music.play().catch(() => {
            document.addEventListener('click', playAudio);
        });
    }
});

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    myRole = params.get('role');
    myLobbyCode = params.get('code');
    const nameFromUrl = params.get('name');
    if (nameFromUrl) {
        globalName = decodeURIComponent(nameFromUrl);
    }
}

// --- 3. SĀKUMA MENU ---

function validateName() {
    const nameInput = document.getElementById('start-player-name');
    if (!nameInput) return globalName;
    
    const name = nameInput.value.trim();
    if (!name) {
        alert("Lūdzu ievadi Vārdu vai Komandas nosaukumu!");
        return null;
    }
    return name;
}

function startSingleGame() {
    const name = validateName();
    if (name) {
        location.href = `map.html?name=${encodeURIComponent(name)}`;
    }
}

function openLobby() {
    const name = validateName();
    if (!name) return;

    fetch('lobby.php?action=create')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const code = data.code;
                document.getElementById('lobby-code').innerText = code;
                toggleModal('mode-modal');
                setTimeout(() => { toggleModal('lobby-modal'); }, 100);
                startLobbyPolling(code, name);
            } else {
                alert("Kļūda veidojot istabu.");
            }
        });
}

function joinGame() {
    const name = validateName(); 
    if (!name) return;

    const codeInput = document.getElementById('join-code').value;
    if (codeInput.length === 4 && !isNaN(codeInput)) {
        fetch(`lobby.php?action=join&code=${codeInput}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    location.href = `map.html?mode=multi&role=guest&code=${codeInput}&name=${encodeURIComponent(name)}`;
                } else {
                    alert("Kļūda! Pārbaudi kodu.");
                }
            });
    } else {
        alert("Nepareizs kods!");
    }
}

function startLobbyPolling(code, name) {
    if (lobbyInterval) clearInterval(lobbyInterval);
    lobbyInterval = setInterval(() => {
        fetch(`lobby.php?action=check&code=${code}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'ready') {
                    clearInterval(lobbyInterval);
                    location.href = `map.html?mode=multi&role=host&code=${code}&name=${encodeURIComponent(name)}`;
                }
            });
    }, 2000);
}

// --- 4. KARTES LOĢIKA ---

function updateMapState() {
    const points = document.querySelectorAll('.point');
    if (points.length === 0) return;

    points.forEach(point => {
        const onclickAttr = point.getAttribute('onclick');
        const type = onclickAttr.match(/'([^']+)'/)[1]; 
        const sequenceIndex = taskSequence.indexOf(type);
        
        point.className = point.className.replace(/\b(active-point|inactive-point)\b/g, "");
        point.style = ""; 

        if (sequenceIndex < completedTasks) {
            point.classList.add('inactive-point');
            point.style.backgroundColor = "#555"; 
            point.style.borderColor = "#555";
        } else if (sequenceIndex === completedTasks) {
            point.classList.add('active-point');
            point.style.pointerEvents = "auto";
        } else {
            point.classList.add('inactive-point');
        }
    });
}

function startActivity(type) {
    const expectedTask = taskSequence[completedTasks];
    if (type !== expectedTask) {
        alert("Pildi uzdevumus secībā!");
        return;
    }
    currentTask = type;
    
    if (type === 'Osta') {
        startBoatGame();
    } 
    else if (myRole && myLobbyCode) {
        showMiniGame(type); 
    } 
    else {
        showQuiz(type);
    }
}

// --- 5. OSTAS LAIVU SPĒLE ---
let boatPosition = 0;
let boatTimer = null;
let boatStartTime = 0;
let boatGameActive = false;

function startBoatGame() {
    const modal = document.getElementById('game-modal');
    const content = document.querySelector('.task-section');
    modal.style.display = 'block';

    content.innerHTML = `
        <h2>Ostas Regate: ${globalName}</h2>
        <p>Spied <strong>SPACE</strong> (Atstarpi) ātri!</p>
        <div style="position: relative; width: 100%; height: 60px; background: #004488; border: 2px solid white; margin: 20px 0; border-radius: 10px; overflow: hidden;">
            <div style="position: absolute; right: 20px; top: 0; bottom: 0; width: 5px; background: repeating-linear-gradient(45deg, #fff, #fff 5px, #000 5px, #000 10px);"></div>
            <div id="player-boat" style="position: absolute; left: 0; top: 10px; font-size: 30px; transition: left 0.1s linear;">🚣</div>
        </div>
        <h3 id="boat-timer">0.00 s</h3>
        <button id="btn-start-boat" class="btn" onclick="initBoatRace()">SĀKT</button>
    `;
}

function initBoatRace() {
    boatPosition = 0;
    boatGameActive = true;
    boatStartTime = Date.now();
    document.getElementById('btn-start-boat').style.display = 'none';
    
    boatTimer = setInterval(() => {
        const now = Date.now();
        const diff = (now - boatStartTime) / 1000;
        document.getElementById('boat-timer').innerText = diff.toFixed(2) + " s";
    }, 50);
    document.addEventListener('keydown', rowBoat);
}

function rowBoat(e) {
    if (!boatGameActive) return;
    if (e.code === 'Space') {
        e.preventDefault();
        boatPosition += 4; 
        document.getElementById('player-boat').style.left = boatPosition + '%';
        if (boatPosition >= 90) finishBoatRace();
    }
}

function finishBoatRace() {
    boatGameActive = false;
    clearInterval(boatTimer);
    document.removeEventListener('keydown', rowBoat);
    
    const finalTime = ((Date.now() - boatStartTime) / 1000).toFixed(2);
    let pointsEarned = finalTime < 5 ? 20 : (finalTime < 10 ? 10 : 5);
    score += pointsEarned;
    document.getElementById('score-display').innerText = "Punkti: " + score;

    saveMiniScore('osta', finalTime);
}

function saveMiniScore(game, time) {
    fetch(`mini_backend.php?action=save&game=${game}&name=${encodeURIComponent(globalName)}&time=${time}`)
        .then(() => showMiniLeaderboard(game));
}

function showMiniLeaderboard(game) {
    fetch(`mini_backend.php?action=get&game=${game}`)
        .then(res => res.json())
        .then(data => {
            let html = `<h2>TOP 5 Ātrākie: ${game}</h2>
                        <table style="width:100%; text-align:left; margin-bottom: 20px;"><tr><th>Vārds</th><th>Laiks</th></tr>`;
            data.forEach(row => { html += `<tr><td>${row.name}</td><td>${row.time} s</td></tr>`; });
            html += `</table><button class="btn" onclick="closeBoatGame()">Turpināt</button>`;
            document.querySelector('.task-section').innerHTML = html;
        });
}

function closeBoatGame() {
    document.getElementById('game-modal').style.display = 'none';
    completedTasks++; 
    updateMapState(); 
    if (completedTasks === taskSequence.length) showEndGame();
}

// --- 6. MULTIPLAYER ---

function showMiniGame(type) {
    const modal = document.getElementById('game-modal');
    modal.style.display = "block";
    const contentDiv = document.querySelector('.task-section');

    if (type === 'Cietums') {
        let codePart = (myRole === 'host') ? "4 2 _ _" : "_ _ 9 1";
        contentDiv.innerHTML = `
            <h2>Uzdevums: Karostas Drošība</h2>
            <p>Saslēdziet drošības sistēmu kopā!</p>
            <div style="background:#000; color:#0f0; padding:20px; font-family:monospace; font-size:24px; margin: 10px 0;">KODS: ${codePart}</div>
            <p>Ievadi pilno kodu (4291):</p>
            <input type="text" id="mini-input" placeholder="4 cipari" class="input-field" style="width: 50%;">
            <button class="btn" onclick="checkMiniAnswer('4291')">Atbloķēt</button>
        `;
    } else {
        contentDiv.innerHTML = `
            <h2>Gatavojies jautājumam!</h2>
            <p>Komanda: ${globalName}</p>
            <button id="btn-mini-action" class="btn" onclick="completeGenericTask()">Esmu Gatavs</button>
            <p id="partner-status" style="display:none; color:#ffaa00; margin-top:10px;">Gaidam partneri...</p>
        `;
    }
}

function checkMiniAnswer(correct) {
    if (document.getElementById('mini-input').value === correct) {
         fetch(`lobby.php?action=update_game&code=${myLobbyCode}&role=${myRole}`).then(() => startSyncCheck(currentTask));
    } else alert("Nepareizs kods!");
}

function completeGenericTask() {
    const btn = document.getElementById('btn-mini-action');
    btn.disabled = true; btn.style.backgroundColor = "green"; btn.innerText = "Gaidam...";
    document.getElementById('partner-status').style.display = 'block';
    fetch(`lobby.php?action=update_game&code=${myLobbyCode}&role=${myRole}`).then(() => startSyncCheck(currentTask));
}

function startSyncCheck(type) {
    const modalContent = document.querySelector('.task-section');
    if(!modalContent.innerHTML.includes("loading-spinner")) {
         modalContent.innerHTML = `<h2>Gaidam otru spēlētāju...</h2><div id="loading-spinner" style="margin: 20px auto; width: 40px; height: 40px; border: 4px solid #333; border-top: 4px solid #ffaa00; border-radius: 50%; animation: spin 1s linear infinite;"></div>`;
    }
    if (gameSyncInterval) clearInterval(gameSyncInterval);
    gameSyncInterval = setInterval(() => {
        fetch(`lobby.php?action=get_state&code=${myLobbyCode}`).then(res => res.json()).then(data => {
            if (data.host_done && data.guest_done) {
                clearInterval(gameSyncInterval);
                if (myRole === 'host') fetch(`lobby.php?action=reset_task&code=${myLobbyCode}`);
                setTimeout(() => { showQuiz(type); }, 500);
            }
        });
    }, 1000);
}

// --- 7. JAUTĀJUMI UN BEIGAS ---

function showQuiz(type) {
    const modal = document.getElementById('game-modal');
    modal.style.display = "block";
    const task = questions[type];
    const contentDiv = document.querySelector('.task-section');
    
    contentDiv.innerHTML = `
        <h2 id="task-title">${type}</h2>
        <p id="task-desc">${task.q}</p>
        <input type="text" id="answer-input" placeholder="Tava atbilde..." class="input-field">
        <button id="btn-submit" class="btn" onclick="checkAnswer()">Iesniegt</button>
    `;
    const guideHint = document.getElementById('guide-hint');
    if(guideHint) guideHint.innerText = task.fact;
    currentCorrectAnswer = task.a;
}

function checkAnswer() {
    const ansInput = document.getElementById('answer-input');
    if (!ansInput) return; 
    const ans = ansInput.value.trim();
    
    if(ans.toLowerCase() === currentCorrectAnswer.toLowerCase()) {
        score += 10; alert("Pareizi! +10 punkti.");
    } else {
        score -= 5; alert("Nepareizi! -5 punkti.");
    }

    document.getElementById('score-display').innerText = "Punkti: " + score;
    completedTasks++;
    document.getElementById('game-modal').style.display = "none";
    updateMapState();
    if (completedTasks === taskSequence.length) showEndGame();
}

function showEndGame() {
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const formattedTime = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;

    finishGame(globalName, score, formattedTime);
}

function finishGame(playerName, finalScore, finalTime) {
    const url = `save_score.php?name=${encodeURIComponent(playerName)}&score=${finalScore}&time=${encodeURIComponent(finalTime)}`;
    
    fetch(url)
    .then(response => response.text())
    .then(data => {
        location.href = 'leaderboard.php';
    });
}

// --- 8. PAPILDUS FUNKCIJAS ---

function toggleModal(id) {
    const modal = document.getElementById(id);
    if(modal) {
        document.querySelectorAll('.modal').forEach(m => { if(m.id !== id) m.style.display = 'none'; });
        modal.style.display = (modal.style.display === "block") ? "none" : "block";
    }
}
function exitGame() { if (confirm("Vai tiešām iziet?")) window.close(); }
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);

    const data = translations[lang];
    if (!data) return;

    for (const key in data) {
        const element = document.getElementById(key);
        if (element) {
            if (element.tagName === 'INPUT') {
                element.placeholder = data[key];
            } else {
                element.innerText = data[key];
            }
        }
    }

    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.querySelector(`button[onclick="setLanguage('${lang}')"]`);
    if(activeBtn) activeBtn.classList.add('active');
}

// --- 9. SKAŅAS IESTATĪJUMI ---

function setMusicVolume(val) {
    const music = document.getElementById('bg-music');
    if (music) {
        music.volume = val / 100;
    }
}

function setSFXVolume(val) {
    const sfx = document.getElementById('hover-sound');
    if (sfx) {
        sfx.volume = val / 100;
        if (val > 0) {
            sfx.currentTime = 0;
            sfx.play().catch(() => {});
        }
    }
}