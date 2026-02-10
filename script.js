// --- GLOBĀLIE MAINĪGIE ---
let score = 0;
let currentTask = "";
let completedTasks = 0;
let currentCorrectAnswer = ""; 
let currentLang = localStorage.getItem('lang') || 'lv';
let startTime; 
let myRole = '';
let myLobbyCode = '';
let gameSyncInterval = null;
let lobbyInterval = null;

// --- OBLIGĀTĀ SECĪBA (Maršruts) ---
const taskSequence = [
    'RTU',          // 1. Sākums (Akadēmija)
    'Dzintars',     // 2. Kultūra
    'Teatris',      // 3. Kultūra
    'Kanals',       // 4. Vēsture
    'Osta',         // 5. Industrija
    'LSEZ',         // 6. Industrija
    'Cietums',      // 7. Vēsture
    'Mols',         // 8. Daba
    'Ezerkrasts',   // 9. Daba
    'Parks'         // 10. BEIGAS
];

// --- JAUTĀJUMU DATUBĀZE ---
const questions = {
    'RTU': { q: "Kurā gadā dibināta Liepājas akadēmija?", a: "1954", fact: "Šeit mācās gudrākie prāti! Sākumā tā bija pedagoģijas augstskola." },
    'Mols': { q: "Cik metrus garš ir Ziemeļu mols?", a: "1800", fact: "Turi cepuri! Šis mols ir celts, lai pasargātu ostu no vētrām." },
    'Cietums': { q: "Kā sauc Karostas tūrisma cietumu?", a: "Karostas cietums", fact: "Vienīgais militārais cietums Eiropā, kas atvērts tūristiem!" },
    'Dzintars': { q: "Kā sauc Liepājas koncertzāli?", a: "Lielais Dzintars", fact: "Tā izskatās pēc milzīga dzintara gabala, vai ne?" },
    'Teatris': { q: "Kurā gadā dibināts Liepājas Teātris?", a: "1907", fact: "Tas ir vecākais profesionālais latviešu teātris!" },
    'Kanals': { q: "Kā sauc kanālu starp ezeru un jūru?", a: "Tirdzniecības", fact: "Šis kanāls savieno Liepājas ezeru ar Baltijas jūru." },
    'Osta': { q: "Kā sauc Liepājas speciālo zonu?", a: "LSEZ", fact: "Osta šeit nekad neaizsalst, tāpēc kuģi kursē visu gadu." },
    'Parks': { q: "Kā sauc parku pie jūras?", a: "Jūrmalas", fact: "Viens no lielākajiem dendroloģiskajiem parkiem Latvijā!" },
    'LSEZ': { q: "Vai UPB ir Liepājas uzņēmums (Jā/Nē)?", a: "Jā", fact: "Jā, un tas būvē ēkas visā pasaulē!" },
    'Ezerkrasts': { q: "Kāda ezera krastā ir taka?", a: "Liepājas", fact: "Liepājas ezers ir piektais lielākais Latvijā." }
};

// --- TULKOJUMI ---
const translations = {
    lv: {
        "answer-input": "Tava atbilde...",
        "btn-submit": "Iesniegt",
        "alert-correct": "Pareizi! +10 punkti.",
        "alert-wrong": "Nepareizi! -5 punkti. Pareizā atbilde bija: ",
        "score-label": "Punkti: ",
        "alert-name": "Lūdzu ievadi vārdu!",
        "alert-saved": "Rezultāts saglabāts!",
        "alert-error": "Kļūda saglabājot: ",
        "alert-exit": "Vai tiešām vēlies iziet?",
        "alert-bad-code": "Nepareizs kods vai istaba pilna"
    },
    en: {
        "answer-input": "Your answer...",
        "btn-submit": "Submit",
        "alert-correct": "Correct! +10 points.",
        "alert-wrong": "Wrong! -5 points. Correct answer: ",
        "score-label": "Score: ",
        "alert-name": "Please enter your name!",
        "alert-saved": "Result saved!",
        "alert-error": "Error saving: ",
        "alert-exit": "Do you really want to exit?",
        "alert-bad-code": "Invalid code or room full"
    }
};

// --- IELĀDE ---
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    myRole = params.get('role');
    myLobbyCode = params.get('code');
}

document.addEventListener('DOMContentLoaded', () => {
    getQueryParams();
    startTime = Date.now();
    
    if(localStorage.getItem('lang') === 'en') setLanguage('en');

    updateMapState();

    const tooltip = document.getElementById('tooltip');
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
        p.addEventListener('mouseout', () => {
            tooltip.style.display = 'none';
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") {
            const gameModal = document.getElementById('game-modal');
            if (gameModal.style.display !== "block") {
                 document.querySelectorAll('.modal').forEach(m => m.style.display = "none");
            }
        }
    });
});

// --- KARTES ATJAUNINĀŠANA ---
function updateMapState() {
    const points = document.querySelectorAll('.point');
    
    points.forEach(point => {
        const onclickAttr = point.getAttribute('onclick');
        const type = onclickAttr.match(/'([^']+)'/)[1];
        const sequenceIndex = taskSequence.indexOf(type);
        
        point.style.pointerEvents = "none"; 
        point.style.opacity = "0.4";
        point.style.filter = "grayscale(100%)";
        point.style.animation = "none";

        if (sequenceIndex < completedTasks) {
           
            point.style.backgroundColor = "#555"; 
        } 
        else if (sequenceIndex === completedTasks) {
            
            point.style.pointerEvents = "auto";
            point.style.opacity = "1";
            point.style.filter = "none";
            point.style.animation = "pulse 2s infinite"; 
        }
    });
}

// --- SPĒLES DARBĪBAS ---

function startActivity(type) {

    const expectedTask = taskSequence[completedTasks];
    
    if (type !== expectedTask) {
        alert("Lūdzu pildi uzdevumus secībā! Meklē punktu, kas mirgo.");
        return;
    }

    currentTask = type;

    if (myRole && myLobbyCode) {
        showMiniGame(type); 
    } else {
        showQuiz(type);
    }
}

function showMiniGame(type) {
    const modal = document.getElementById('game-modal');
    modal.style.display = "block";
    const contentDiv = document.querySelector('.task-section');

    if (type === 'Cietums') {
        let codePart = (myRole === 'host') ? "4 2 _ _" : "_ _ 9 1";
        contentDiv.innerHTML = `
            <h2>Uzdevums: Karostas Drošība</h2>
            <p>Jums jāsaslēdz drošības sistēma kopā!</p>
            <div style="background:#000; color:#0f0; padding:20px; font-family:monospace; font-size:24px; margin: 10px 0;">KODS: ${codePart}</div>
            <p>Paprasi draugam viņa daļu un ievadi pilno kodu (4291):</p>
            <input type="text" id="mini-input" placeholder="4 cipari" class="input-field" style="width: 50%;">
            <button class="btn" onclick="checkMiniAnswer('4291')">Atbloķēt</button>
        `;
    } else {
        contentDiv.innerHTML = `
            <h2>Gatavojies jautājumam!</h2>
            <p>Nospiediet pogu abi reizē, lai sāktu!</p>
            <button id="btn-mini-action" class="btn" onclick="completeGenericTask()">Esmu Gatavs</button>
            <p id="partner-status" style="display:none; color:#ffaa00; margin-top:10px;">Gaidam draugu...</p>
        `;
    }
}

function checkMiniAnswer(correct) {
    const val = document.getElementById('mini-input').value;
    if (val === correct) {
         fetch(`lobby.php?action=update_game&code=${myLobbyCode}&role=${myRole}`)
            .then(() => startSyncCheck(currentTask));
    } else {
        alert("Nepareizs kods!");
    }
}

function completeGenericTask() {
    const btn = document.getElementById('btn-mini-action');
    btn.disabled = true;
    btn.style.backgroundColor = "green";
    btn.innerText = "Gaidam...";
    document.getElementById('partner-status').style.display = 'block';
    
    fetch(`lobby.php?action=update_game&code=${myLobbyCode}&role=${myRole}`)
        .then(() => startSyncCheck(currentTask));
}

function startSyncCheck(type) {
    const modalContent = document.querySelector('.task-section');
    if(!modalContent.innerHTML.includes("loading-spinner") && !document.getElementById('partner-status')) {
         modalContent.innerHTML = `<h2>Gaidam otru spēlētāju...</h2><div id="loading-spinner" style="margin: 20px auto; width: 40px; height: 40px; border: 4px solid #333; border-top: 4px solid #ffaa00; border-radius: 50%; animation: spin 1s linear infinite;"></div>`;
    }

    if (gameSyncInterval) clearInterval(gameSyncInterval);

    gameSyncInterval = setInterval(() => {
        fetch(`lobby.php?action=get_state&code=${myLobbyCode}`)
            .then(res => res.json())
            .then(data => {
                if (data.host_done === true && data.guest_done === true) {
                    clearInterval(gameSyncInterval);
                    if (myRole === 'host') {
                        fetch(`lobby.php?action=reset_task&code=${myLobbyCode}`);
                    }
                    setTimeout(() => { showQuiz(type); }, 500);
                }
            });
    }, 1000);
}

function showQuiz(type) {
    const modal = document.getElementById('game-modal');
    modal.style.display = "block"; 

    const task = questions[type];
    const contentDiv = document.querySelector('.task-section');
    const t = translations[currentLang];
    
    contentDiv.innerHTML = `
        <h2 id="task-title">${type}</h2>
        <p id="task-desc">${task.q}</p>
        <input type="text" id="answer-input" placeholder="${t['answer-input']}" class="input-field">
        <button id="btn-submit" class="btn" onclick="checkAnswer()">${t['btn-submit']}</button>
    `;

    const guideHint = document.getElementById('guide-hint');
    if(guideHint) guideHint.innerText = task.fact;
    
    currentCorrectAnswer = task.a;
}

function checkAnswer() {
    const ansInput = document.getElementById('answer-input');
    const modal = document.getElementById('game-modal');
    if (!ansInput) return; 

    const ans = ansInput.value.trim();
    const t = translations[currentLang];
    
    if(ans.toLowerCase() === currentCorrectAnswer.toLowerCase()) {
        score += 10;
        alert(t["alert-correct"]);
    } else {
        score -= 5; 
        alert(t["alert-wrong"] + currentCorrectAnswer);
    }

    const scoreDisplay = document.getElementById('score-display');
    if(scoreDisplay) scoreDisplay.innerText = t["score-label"] + score;
    
    completedTasks++;
    modal.style.display = "none";
    
    updateMapState();

    if (completedTasks === taskSequence.length) {
        showEndGame();
    }
}

// --- BEIGU EKRĀNS ---
function showEndGame() {
    const finalScoreElem = document.getElementById('final-score');
    if (finalScoreElem) finalScoreElem.innerText = score;
    
    
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    const formattedTime = (minutes < 10 ? '0' : '') + minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    
    
    const pointsText = document.getElementById('end-points');
    if(pointsText) pointsText.innerText = " punkti. Laiks: " + formattedTime;

    const endModal = document.getElementById('end-modal');
    if (endModal) endModal.style.display = "block";
    
    
    window.finalTimeStr = formattedTime;
}

function submitResult() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput ? nameInput.value.trim() : "";
    const t = translations[currentLang];

    if(!name) { alert(t["alert-name"]); return; }
    
    finishGame(name, score, window.finalTimeStr);
}

function finishGame(playerName, finalScore, finalTime) {
    const url = `save_score.php?name=${encodeURIComponent(playerName)}&score=${finalScore}&time=${encodeURIComponent(finalTime)}`;
    const t = translations[currentLang];

    fetch(url)
    .then(response => response.text())
    .then(data => {
        if (data.trim() === "Success") {
            alert(t["alert-saved"]);
            location.href = 'leaderboard.php';
        } else {
            alert(t["alert-error"] + data);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert("Tīkla kļūda.");
    });
}

// --- MENU UN IESTATĪJUMI ---
function toggleModal(id) {
    const modal = document.getElementById(id);
    if(modal) {
        document.querySelectorAll('.modal').forEach(m => {
            if(m.id !== id) m.style.display = 'none';
        });
        modal.style.display = (modal.style.display === "block") ? "none" : "block";
    }
}

function exitGame() {
    const t = translations[currentLang];
    if (confirm(t["alert-exit"])) {
        window.close(); 
        location.href = "https://google.com"; 
    }
}

function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    
}

// --- LOBBY ---
function openLobby() {
    fetch('lobby.php?action=create')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const code = data.code;
                document.getElementById('lobby-code').innerText = code;
                toggleModal('mode-modal');
                setTimeout(() => { toggleModal('lobby-modal'); }, 100);
                startLobbyPolling(code);
            } else {
                alert("Kļūda veidojot istabu.");
            }
        });
}

function startLobbyPolling(code) {
    if (lobbyInterval) clearInterval(lobbyInterval);
    lobbyInterval = setInterval(() => {
        fetch(`lobby.php?action=check&code=${code}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'ready') {
                    clearInterval(lobbyInterval);
                    alert("Draugs pievienojās! Spēle sākas.");
                    location.href = `map.html?mode=multi&role=host&code=${code}`;
                }
            });
    }, 2000);
}

function joinGame() {
    const codeInput = document.getElementById('join-code').value;
    if (codeInput.length === 4 && !isNaN(codeInput)) {
        fetch(`lobby.php?action=join&code=${codeInput}`)
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert("Veiksmīgi pievienojies!");
                    location.href = `map.html?mode=multi&role=guest&code=${codeInput}`;
                } else {
                    alert("Kļūda!");
                }
            });
    } else {
        alert("Nepareizs kods!");
    }
}

document.getElementById('btn-close-lobby')?.addEventListener('click', () => {
    if (lobbyInterval) clearInterval(lobbyInterval);
});