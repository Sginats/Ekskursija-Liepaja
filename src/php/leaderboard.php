<!DOCTYPE html>
<html lang="lv">
<head>
    <meta charset="UTF-8">
    <title>Top 10 Rezultāti</title>
    <link rel="stylesheet" href="../../style.css">
    
    <script src="../../src/js/script.js?v=20260216194225" defer></script>
    <style>
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
    </style>
</head>
<body>
    <audio id="hover-sound" src="../../assets/skana/hover.mp3" preload="auto"></audio>

    <!-- Connection Status Indicator -->
    <div id="connection-status" class="connection-status" style="display: none;"></div>

    <div class="container">
        <h1 class="title">🏆 Top 10 Rezultāti</h1>
        <p class="sort-info">Kārtots pēc: <span id="sort-mode">Kombinētā vērtējuma (Punkti + Laiks)</span></p>
        <table class="tabulaLead">
            <thead>
                <tr id="tabulaiTR">
                    <th id="nummurs">#</th>
                    <th id="vardi">Vārds</th>
                    <th id="laiki" onclick="sortByTime()">Laiks <span id="time-indicator" class="sort-indicator"></span></th>
                    <th id="punkti" onclick="sortByScore()">Punkti <span id="score-indicator" class="sort-indicator"></span></th>
                </tr>
            </thead>
            <tbody id="leaderboard-body">
                <?php
                $file = __DIR__ . "/../data/leaderboard.txt";
                
                if (file_exists($file)) {
                    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                    $results = [];
                    foreach ($lines as $line) {
                        $parts = explode("|", $line);
                        if (count($parts) >= 3) {
                            $timeParts = explode(':', $parts[2]);
                            $timeInSeconds = 0;
                            // Support both MM:SS and legacy HH:MM:SS formats
                            if (count($timeParts) === 2) {
                                $timeInSeconds = (int)$timeParts[0] * 60 + (int)$timeParts[1];
                            } elseif (count($timeParts) === 3) {
                                $timeInSeconds = (int)$timeParts[0] * 3600 + (int)$timeParts[1] * 60 + (int)$timeParts[2];
                            }
                            
                            // Normalize display to MM:SS
                            $displayMinutes = floor($timeInSeconds / 60);
                            $displaySeconds = $timeInSeconds % 60;
                            $displayTime = sprintf("%02d:%02d", $displayMinutes, $displaySeconds);
                            
                            $results[] = [
                                'name' => $parts[0],
                                'score' => (int)$parts[1],
                                'time' => $displayTime,
                                'timeInSeconds' => $timeInSeconds
                            ];
                        }
                    }

                    // Output as JSON for JavaScript
                    echo "<script>const leaderboardData = " . json_encode($results) . ";</script>";
                } else {
                    echo "<script>const leaderboardData = [];</script>";
                }
                ?>
            </tbody>
        </table>
        <!-- make the button centered -->
        <button class="btn"  onclick="location.href='../../index.html'">Atpakaļ</button>
    </div>
    <script>
        let currentSort = 'combo';
        
        // Calculate combo score (higher score + faster time = better)
        function calculateComboScore(entry) {
            // Score component: 0-100 points
            const scoreComponent = entry.score;
            // Time component: Assuming max reasonable game completion time is 60 minutes
            // This value is based on typical game completion being 10-30 minutes
            const maxTime = 3600;
            const timeComponent = Math.max(0, (maxTime - entry.timeInSeconds) / maxTime * 100);
            // Combined score: 60% weight on points (knowledge), 40% weight on time (efficiency)
            return (scoreComponent * 0.6) + (timeComponent * 0.4);
        }
        
        function sortByCombo() {
            currentSort = 'combo';
            const sorted = [...leaderboardData].sort((a, b) => {
                return calculateComboScore(b) - calculateComboScore(a);
            });
            renderLeaderboard(sorted);
            updateSortIndicators();
            document.getElementById('sort-mode').textContent = 'Kombinētā vērtējuma (Punkti + Laiks)';
        }
        
        function sortByTime() {
            if (currentSort === 'time') {
                currentSort = 'combo';
                sortByCombo();
            } else {
                currentSort = 'time';
                const sorted = [...leaderboardData].sort((a, b) => {
                    return a.timeInSeconds - b.timeInSeconds;
                });
                renderLeaderboard(sorted);
                updateSortIndicators();
                document.getElementById('sort-mode').textContent = 'Laiks (Ātrākais pirmais)';
            }
        }
        
        function sortByScore() {
            if (currentSort === 'score') {
                currentSort = 'combo';
                sortByCombo();
            } else {
                currentSort = 'score';
                const sorted = [...leaderboardData].sort((a, b) => {
                    return b.score - a.score;
                });
                renderLeaderboard(sorted);
                updateSortIndicators();
                document.getElementById('sort-mode').textContent = 'Punktu (Vairāk pirmais)';
            }
        }
        
        function updateSortIndicators() {
            document.getElementById('time-indicator').textContent = currentSort === 'time' ? '↓' : '';
            document.getElementById('score-indicator').textContent = currentSort === 'score' ? '↓' : '';
        }
        
        function renderLeaderboard(data) {
            const tbody = document.getElementById('leaderboard-body');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">Nav rezultātu</td></tr>';
                return;
            }
            
            const top10 = data.slice(0, 10);
            top10.forEach((row, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${escapeHtml(row.name)}</td>
                    <td>${row.time}</td>
                    <td>${row.score}</td>
                `;
                tbody.appendChild(tr);
            });
        }
        
        function escapeHtml(text) {
            return String(text)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }
        
        // Initialize with combo sort
        sortByCombo();
    </script>
</body>
</html>