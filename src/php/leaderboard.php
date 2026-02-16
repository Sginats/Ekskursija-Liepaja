<!DOCTYPE html>
<html lang="lv">
<head>
    <meta charset="UTF-8">
    <title>Top 10 Rezultāti</title>
    <link rel="stylesheet" href="../../public/style.css">
</head>
<body>
    <div class="container">
        <h1 class="title">🏆 Top 10 Rezultāti</h1>
        <p>Ātrākie spēlētāji Liepājas ekskursijā</p>
        <table class="tabulaLead">
            <thead>
                <tr id="tabulaiTR">
                    <th id="nummurs">#</th>
                    <th id="vardi">Vārds</th>
                    <th id="laiki">Laiks</th>
                    <th id="punkti">Punkti</th>
                </tr>
            </thead>
            <tbody>
                <?php
                $file = __DIR__ . "/leaderboard.txt";
                
                if (file_exists($file)) {
                    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                    $results = [];
                    foreach ($lines as $line) {
                        $parts = explode("|", $line);
                        if (count($parts) >= 3) {
                            $results[] = [
                                'name' => $parts[0],
                                'score' => (int)$parts[1],
                                'time' => $parts[2] 
                            ];
                        }
                    }

                    usort($results, function($a, $b) {
                        
                        return strcmp($a['time'], $b['time']);
                    });

                    $top10 = array_slice($results, 0, 10);
                    foreach ($top10 as $row) {
                        echo "<tr>";
                        echo "<td>" . htmlspecialchars($row['name']) . "</td>";
                        echo "<td>{$row['score']}</td>";
                        echo "<td>{$row['time']}</td>";
                        echo "</tr>";
                    }
                } else {
                    echo "<tr><td colspan='3'>Nav rezultātu</td></tr>";
                }
                ?>
            </tbody>
        </table>
        <button class="btn" onclick="location.href='../../public/index.html'">Atpakaļ</button>
    </div>
</body>
</html>