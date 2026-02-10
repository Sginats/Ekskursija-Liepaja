// --- GLOBĀLIE MAINĪGIE ---
let score = 0;
let currentTask = "";
let completedTasks = 0;
let currentCorrectAnswer = ""; 
let currentLang = localStorage.getItem('lang') || 'lv'; // Ielādē saglabāto valodu

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
        // Index & Menu
        "main-title": "LIEPĀJAS KARTE",
        "subtitle": "EKSKURSIJA",
        "btn-start": "Sākt spēli",
        "btn-about": "Par spēli",
        "btn-leaderboard": "Top 10",
        "btn-settings": "Iestatījumi",
        "btn-exit": "Iziet",
        "settings-title": "Iestatījumi",
        "audio-title": "Audio",
        "label-music": "Mūzika",
        "label-sfx": "Skaņas efekti",
        "lang-title": "Valoda / Language",
        "btn-close-settings": "Aizvērt",
        "btn-close-about": "Aizvērt",
        "about-title": "Par Spēli",
        "about-game-label": "Spēle:",
        "about-goal-label": "Mērķis:",
        "about-goal-text": "Iepazīt Liepājas kultūrvēsturiskās vietas, uzņēmumus un RTU akadēmiju.",
        "legend-title": "Objektu nozīme kartē",
        "legend-green": "Zaļš: Daba un atpūta (Viegli)",
        "legend-blue": "Zils: Kultūra un vēsture (Vidēji)",
        "legend-yellow": "Dzeltens: RTU Liepājas akadēmija (Eksperts)",
        "legend-red": "Sarkans: Industrija un osta (Izaicinājums)",
        "tech-title": "Tehnoloģijas",
        "dev-title": "Izstrādātāji (2PT)",
        "res-title": "Izmantotie resursi",
        "btn-start-about": "SĀKT SPĒLI",
        
        // Mode & Lobby
        "mode-title": "Izvēlies režīmu",
        "btn-single": "Spēlēt vienam",
        "btn-lobby": "Spēlēt ar draugu",
        "join-code": "Ievadi drauga kodu", // Placeholder
        "btn-join": "Pievienoties",
        "btn-cancel-mode": "Atcelt",
        "lobby-title": "Lobby",
        "lobby-text": "Tavs istabas kods:",
        "lobby-wait": "Gaidu otru spēlētāju...",
        "btn-start-lobby": "Sākt (Demo)",
        "btn-close-lobby": "Aizvērt",

        // Map UI
        "btn-back": "Atpakaļ",
        "score-label": "Punkti: ",
        "legend-map-title": "Grūtības pakāpes",
        "legend-map-green": "Viegli: Daba un atpūta",
        "legend-map-blue": "Vidēji: Kultūra un vēsture",
        "legend-map-yellow": "Eksperts: RTU akadēmija",
        "legend-map-red": "Izaicinājums: Industrija un osta",
        
        // Game Modal
        "guide-default": "Sveiks! Esmu tavs gids.",
        "task-default-title": "Vieta",
        "task-default-desc": "Jautājums...",
        "answer-input": "Tava atbilde...", // Placeholder
        "btn-submit": "Iesniegt",

        // End Game
        "end-title": "Spēle pabeigta!",
        "end-score-text": "Tavs rezultāts: ",
        "end-points": " punkti",
        "player-name": "Ievadi savu vārdu", // Placeholder
        "btn-save": "Saglabāt rezultātu",

        // Alerts (JS)
        "alert-correct": "Pareizi! +10 punkti.",
        "alert-wrong": "Nepareizi! -5 punkti. Pareizā atbilde bija: ",
        "alert-name": "Lūdzu ievadi vārdu!",
        "alert-saved": "Rezultāts saglabāts!",
        "alert-error": "Kļūda saglabājot: ",
        "alert-exit": "Vai tiešām vēlies iziet?",
        "alert-joining": "Pievienojas istabai ",
        "alert-bad-code": "Nepareizs kods! Jābūt 4 cipariem."
    },
    en: {
        // Index & Menu
        "main-title": "LIEPAJA MAP",
        "subtitle": "EXCURSION",
        "btn-start": "Start Game",
        "btn-about": "About Game",
        "btn-leaderboard": "Top 10",
        "btn-settings": "Settings",
        "btn-exit": "Exit",
        "settings-title": "Settings",
        "audio-title": "Audio",
        "label-music": "Music",
        "label-sfx": "Sound Effects",
        "lang-title": "Language",
        "btn-close-settings": "Close",
        "btn-close-about": "Close",
        "about-title": "About Game",
        "about-game-label": "Game:",
        "about-goal-label": "Goal:",
        "about-goal-text": "Explore Liepaja's historical sites, companies, and RTU academy.",
        "legend-title": "Map Legend",
        "legend-green": "Green: Nature & Leisure (Easy)",
        "legend-blue": "Blue: Culture & History (Medium)",
        "legend-yellow": "Yellow: RTU Academy (Expert)",
        "legend-red": "Red: Industry & Port (Challenge)",
        "tech-title": "Technologies",
        "dev-title": "Developers (2PT)",
        "res-title": "Resources Used",
        "btn-start-about": "START GAME",

        // Mode & Lobby
        "mode-title": "Choose Mode",
        "btn-single": "Single Player",
        "btn-lobby": "Play with Friend",
        "join-code": "Enter friend's code",
        "btn-join": "Join",
        "btn-cancel-mode": "Cancel",
        "lobby-title": "Lobby",
        "lobby-text": "Your Room Code:",
        "lobby-wait": "Waiting for player 2...",
        "btn-start-lobby": "Start (Demo)",
        "btn-close-lobby": "Close",

        // Map UI
        "btn-back": "Back",
        "score-label": "Score: ",
        "legend-map-title": "Difficulty Levels",
        "legend-map-green": "Easy: Nature & Leisure",
        "legend-map-blue": "Medium: Culture & History",
        "legend-map-yellow": "Expert: RTU Academy",
        "legend-map-red": "Challenge: Industry & Port",

        // Game Modal
        "guide-default": "Hi! I am your guide.",
        "task-default-title": "Location",
        "task-default-desc": "Question...",
        "answer-input": "Your answer...",
        "btn-submit": "Submit",

        // End Game
        "end-title": "Game Over!",
        "end-score-text": "Your score: ",
        "end-points": " points",
        "player-name": "Enter your name",
        "btn-save": "Save Result",

        // Alerts (JS)
        "alert-correct": "Correct! +10 points.",
        "alert-wrong": "Wrong! -5 points. Correct answer: ",
        "alert-name": "Please enter your name!",
        "alert-saved": "Result saved!",
        "alert-error": "Error saving: ",
        "alert-exit": "Do you really want to exit?",
        "alert-joining": "Joining room ",
        "alert-bad-code": "Invalid code! Must be 4 digits."
    }
};

// --- LAPAS IELĀDES LOĢIKA ---
document.addEventListener('DOMContentLoaded', () => {
    

    setLanguage(currentLang);

    const points = document.querySelectorAll('.point');
    const tooltip = document.getElementById('tooltip');

    if (points.length > 0 && tooltip) {
        points.forEach(p => {
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
    }

    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('mouseenter', () => {
            const sound = document.getElementById('hover-sound');
            if(sound) {
                sound.currentTime = 0;
                sound.play().catch(() => {}); 
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") {
            document.querySelectorAll('.modal').forEach(m => m.style.display = "none");
        }
    });
});

// --- SPĒLES FUNKCIJAS ---

function startActivity(type) {
    currentTask = type;
    const task = questions[type];
    const modal = document.getElementById('game-modal');
    
    if(task && modal) {
        const pointElement = document.querySelector(`[onclick="startActivity('${type}')"]`);
        const titleElem = document.getElementById('task-title');
        if(titleElem) titleElem.innerText = pointElement ? pointElement.getAttribute('data-name') : "Uzdevums";
        
        const descElem = document.getElementById('task-desc');
        if(descElem) descElem.innerText = task.q;
        
        const guideHint = document.getElementById('guide-hint');
        if(guideHint) guideHint.innerText = task.fact;
        
        currentCorrectAnswer = task.a;
        modal.style.display = "block";
        document.getElementById('answer-input').value = "";
    }
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
    if(modal) modal.style.display = "none";
    
    const point = document.querySelector(`[onclick="startActivity('${currentTask}')"]`);
    if(point) {
        point.style.pointerEvents = "none";
        point.style.opacity = "0.3";
        point.style.backgroundColor = "#555";
    }

    if (completedTasks === 10) {
        showEndGame();
    }
}

function showEndGame() {
    const finalScoreElem = document.getElementById('final-score');
    if (finalScoreElem) finalScoreElem.innerText = score;
    const endModal = document.getElementById('end-modal');
    if (endModal) endModal.style.display = "block";
}

function submitResult() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput ? nameInput.value.trim() : "";
    const t = translations[currentLang];

    if(!name) { alert(t["alert-name"]); return; }
    
    finishGame(name, score, new Date().toLocaleTimeString());
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

function setMusicVolume(val) {
    const music = document.getElementById('bg-music');
    if (music) {
        music.volume = val / 100;
        if (val > 0 && music.paused) music.play().catch(()=>{});
    }
}

function setSFXVolume(val) {
    const sfx = document.getElementById('hover-sound');
    if (sfx) {
        sfx.volume = val / 100;
        if(val > 0) {
            sfx.currentTime = 0;
            sfx.play().catch(()=>{});
        }
    }
}

// --- VALODAS FUNKCIJA (UZLABOTA) ---
function setLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang); // Saglabā izvēli pārlūkā

    const data = translations[lang];
    if (!data) return;

    // Nomaina pogu stilu
    const lvBtn = document.querySelector("button[onclick=\"setLanguage('lv')\"]");
    const enBtn = document.querySelector("button[onclick=\"setLanguage('en')\"]");
    
    if(lvBtn && enBtn) {
        if(lang === 'lv') {
            lvBtn.classList.add('active');
            enBtn.classList.remove('active');
        } else {
            enBtn.classList.add('active');
            lvBtn.classList.remove('active');
        }
    }

    // Nomaina tekstus pēc ID
    for (const key in data) {
        const element = document.getElementById(key);
        if (element) {
            // Ja tas ir input lauks, mainam placeholder
            if (element.tagName === 'INPUT') {
                element.placeholder = data[key];
            } else {
                element.innerText = data[key];
            }
        }
    }
}

// --- LOBBY FUNKCIJAS ---

function openLobby() {
    const code = Math.floor(1000 + Math.random() * 9000);
    document.getElementById('lobby-code').innerText = code;
    
    toggleModal('mode-modal');
    setTimeout(() => {
        toggleModal('lobby-modal');
    }, 100);
}

function joinGame() {
    const codeInput = document.getElementById('join-code').value;
    const t = translations[currentLang];

    if (codeInput.length === 4 && !isNaN(codeInput)) {
        alert(t["alert-joining"] + codeInput + "...");
        location.href = 'map.html';
    } else {
        alert(t["alert-bad-code"]);
    }
}