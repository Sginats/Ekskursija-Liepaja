// --- GLOBĀLIE MAINĪGIE ---
let score = 0;
let currentTask = "";
let completedTasks = 0;
let currentCorrectAnswer = ""; 

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
        "btn-close-settings": "Aizvērt"
    },
    en: {
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
        "btn-close-settings": "Close"
    }
};

// --- LAPAS IELĀDES LOĢIKA ---
document.addEventListener('DOMContentLoaded', () => {
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
    
    if(ans.toLowerCase() === currentCorrectAnswer.toLowerCase()) {
        score += 10;
        alert("Pareizi! +10 punkti.");
    } else {
        score -= 5; 
        alert("Nepareizi! -5 punkti. Pareizā atbilde bija: " + currentCorrectAnswer);
    }

    const scoreDisplay = document.getElementById('score-display');
    if(scoreDisplay) scoreDisplay.innerText = "Punkti: " + score;
    
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
    if(!name) { alert("Lūdzu ievadi vārdu!"); return; }
    
    finishGame(name, score, new Date().toLocaleTimeString());
}

function finishGame(playerName, finalScore, finalTime) {
    // Sūtam datus caur URL (GET) - visdrošākais veids priekš tava servera
    const url = `save_score.php?name=${encodeURIComponent(playerName)}&score=${finalScore}&time=${encodeURIComponent(finalTime)}`;

    fetch(url)
    .then(response => response.text())
    .then(data => {
        if (data.trim() === "Success") {
            alert("Rezultāts saglabāts!");
            location.href = 'leaderboard.php';
        } else {
            alert("Kļūda saglabājot: " + data);
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
        modal.style.display = (modal.style.display === "block") ? "none" : "block";
    }
}

function exitGame() {
    if (confirm("Vai tiešām vēlies iziet?")) {
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

function setLanguage(lang) {
    const data = translations[lang];
    for (const key in data) {
        const element = document.getElementById(key);
        if (element) {
            element.innerText = data[key];
        }
    }
}