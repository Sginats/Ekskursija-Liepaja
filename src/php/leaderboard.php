<!DOCTYPE html>
<html lang="lv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Top 10 Rezultāti</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../../style.css">
    
    <script src="../../src/js/script.js?v=20260216194225" defer></script>
    <style>
        body { overflow: auto; }
        .sort-indicator {
            font-size: 12px;
            margin-left: 5px;
        }
        th {
            cursor: pointer;
            user-select: none;
        }
        th:hover {
            background: rgba(255, 170, 0, 0.1);
        }
        .sort-info {
            text-align: center;
            color: #ffaa00;
            margin: 10px 0;
            font-size: 14px;
        }
        .lb-tabs {
            display: flex;
            gap: 10px;
            justify-content: center;
            margin-bottom: 18px;
        }
        .lb-tab {
            padding: 9px 28px;
            background: transparent;
            color: #ccc;
            border: 2px solid rgba(255,170,0,0.3);
            border-radius: 8px;
            font-size: 15px;
            font-weight: bold;
            cursor: pointer;
            font-family: inherit;
            transition: all 0.2s;
        }
        .lb-tab.active, .lb-tab:hover {
            color: #ffaa00;
            border-color: #ffaa00;
            background: rgba(255,170,0,0.08);
        }
        .lb-section { display: none; }
        .lb-section.visible { display: block; }
    </style>
</head>
<body>
    <div class="wrap" id="bg-wrap"></div>
    <canvas id="cursor-canvas" style="position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9998;"></canvas>
    <audio id="hover-sound" src="../../skana/hover.wav" preload="auto"></audio>
    <audio id="bg-music" src="../../skana/music.wav" loop preload="auto"></audio>
    <div id="connection-status" class="connection-status" style="display: none;"></div>

    <div class="container" style="position:relative;z-index:1;max-height:100vh;overflow-y:auto;padding:30px 20px;">
        <h1 class="title" style="font-size:52px;">Top 10 Rezultāti</h1>

        <div class="lb-tabs">
            <button class="lb-tab active" onclick="showSection('single', this)">Viens spēlētājs</button>
            <button class="lb-tab" onclick="showSection('teams', this)">Komandas</button>
        </div>

        <!-- Single player section -->
        <div id="section-single" class="lb-section visible">
            <p class="sort-info">Kārtots pēc: <span id="sort-mode-single">Kombinētā vērtējuma (Punkti + Laiks)</span></p>
            <table class="tabulaLead">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Vārds</th>
                        <th onclick="sortSection('single','time')">Laiks <span id="time-ind-single" class="sort-indicator"></span></th>
                        <th onclick="sortSection('single','score')">Punkti <span id="score-ind-single" class="sort-indicator"></span></th>
                    </tr>
                </thead>
                <tbody id="lb-body-single"></tbody>
            </table>
        </div>

        <!-- Teams section -->
        <div id="section-teams" class="lb-section">
            <p class="sort-info">Kārtots pēc: <span id="sort-mode-teams">Kombinētā vērtējuma (Punkti + Laiks)</span></p>
            <table class="tabulaLead">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Vārds</th>
                        <th onclick="sortSection('teams','time')">Laiks <span id="time-ind-teams" class="sort-indicator"></span></th>
                        <th onclick="sortSection('teams','score')">Punkti <span id="score-ind-teams" class="sort-indicator"></span></th>
                    </tr>
                </thead>
                <tbody id="lb-body-teams"></tbody>
            </table>
        </div>

        <button class="btn btnLead" onclick="location.href='../../index.html'" style="margin-top:20px;">Atpakaļ</button>
    </div>

    <?php
    function parseFile($path) {
        $results = [];
        if (!file_exists($path)) return $results;
        $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $parts = explode("|", $line);
            if (count($parts) >= 3) {
                $timeParts = explode(':', $parts[2]);
                $timeInSeconds = 0;
                if (count($timeParts) === 2) {
                    $timeInSeconds = (int)$timeParts[0] * 60 + (int)$timeParts[1];
                } elseif (count($timeParts) === 3) {
                    $timeInSeconds = (int)$timeParts[0] * 3600 + (int)$timeParts[1] * 60 + (int)$timeParts[2];
                }
                $displayTime = sprintf("%02d:%02d", floor($timeInSeconds / 60), $timeInSeconds % 60);
                $results[] = [
                    'name'          => $parts[0],
                    'score'         => (int)$parts[1],
                    'time'          => $displayTime,
                    'timeInSeconds' => $timeInSeconds,
                ];
            }
        }
        return $results;
    }
    $singleData = parseFile(__DIR__ . "/../data/leaderboard.txt");
    $teamsData  = parseFile(__DIR__ . "/../data/teams_leaderboard.txt");
    ?>
    <script>
        const singleData = <?php echo json_encode($singleData); ?>;
        const teamsData  = <?php echo json_encode($teamsData); ?>;
        const sortState  = { single: 'combo', teams: 'combo' };

        function calculateComboScore(entry) {
            const maxTime = 3600;
            const timeComponent = Math.max(0, (maxTime - entry.timeInSeconds) / maxTime * 100);
            return (entry.score * 0.6) + (timeComponent * 0.4);
        }

        function sortSection(section, by) {
            const data = section === 'single' ? singleData : teamsData;
            if (sortState[section] === by) {
                sortState[section] = 'combo';
            } else {
                sortState[section] = by;
            }
            let sorted;
            const mode = sortState[section];
            if (mode === 'time') {
                sorted = [...data].sort((a, b) => a.timeInSeconds - b.timeInSeconds);
                document.getElementById('sort-mode-' + section).textContent = 'Laiks (Ātrākais pirmais)';
            } else if (mode === 'score') {
                sorted = [...data].sort((a, b) => b.score - a.score);
                document.getElementById('sort-mode-' + section).textContent = 'Punktu (Vairāk pirmais)';
            } else {
                sorted = [...data].sort((a, b) => calculateComboScore(b) - calculateComboScore(a));
                document.getElementById('sort-mode-' + section).textContent = 'Kombinētā vērtējuma (Punkti + Laiks)';
            }
            renderTable(section, sorted);
            document.getElementById('time-ind-' + section).textContent  = mode === 'time'  ? '↓' : '';
            document.getElementById('score-ind-' + section).textContent = mode === 'score' ? '↓' : '';
        }

        function renderTable(section, data) {
            const tbody = document.getElementById('lb-body-' + section);
            tbody.innerHTML = '';
            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">Nav rezultātu</td></tr>';
                return;
            }
            data.slice(0, 10).forEach((row, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${index + 1}</td><td>${escapeHtml(row.name)}</td><td>${row.time}</td><td>${row.score}</td>`;
                tbody.appendChild(tr);
            });
        }

        function escapeHtml(text) {
            return String(text)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        }

        function showSection(section, btn) {
            document.querySelectorAll('.lb-section').forEach(el => el.classList.remove('visible'));
            document.querySelectorAll('.lb-tab').forEach(el => el.classList.remove('active'));
            document.getElementById('section-' + section).classList.add('visible');
            btn.classList.add('active');
        }

        // Initial render
        sortSection('single', 'combo');
        sortSection('teams', 'combo');
    </script>
</body>
</html>