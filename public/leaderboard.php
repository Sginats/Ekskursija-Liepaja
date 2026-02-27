<!DOCTYPE html>
<html lang="lv">
<head>
    <meta charset="UTF-8">
    <title>Top 10 Rezultāti</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <h1 class="title">Top 10</h1>

        <h2 style="margin-top: 20px;">Vienpēlētājs</h2>
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
                $file = __DIR__ . "/leaderboard_single.txt";
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
                    $rank = 1;
                    foreach ($top10 as $row) {
                        echo "<tr>";
                        echo "<td id='nummurs'>{$rank}</td>";
                        echo "<td id='vardi'>" . htmlspecialchars($row['name']) . "</td>";
                        echo "<td id='laiki'>{$row['time']}</td>";
                        echo "<td id='punkti'>{$row['score']}</td>";
                        echo "</tr>";
                        $rank++;
                    }
                } else {
                    echo "<tr><td colspan='4'>Nav rezultātu</td></tr>";
                }
                ?>
            </tbody>
        </table>

        <h2 style="margin-top: 20px;">Multiplayer</h2>
        <table class="tabulaLead">
            <thead>
                <tr id="tabulaiTR">
                    <th id="nummurs">#</th>
                    <th id="vardi">Komanda</th>
                    <th id="laiki">Laiks</th>
                    <th id="punkti">Punkti</th>
                </tr>
            </thead>
            <tbody>
                <?php
                $fileMulti = __DIR__ . "/leaderboard_multi.txt";
                if (file_exists($fileMulti)) {
                    $lines = file($fileMulti, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                    $results = [];
                    foreach ($lines as $line) {
                        $parts = explode("|", $line);
                        if (count($parts) >= 3) {
                            $results[] = [
                                'team' => $parts[0],
                                'time' => $parts[1],
                                'score' => (int)$parts[2]
                            ];
                        }
                    }

                    usort($results, function($a, $b) {
                        return strcmp($a['time'], $b['time']);
                    });

                    $top10 = array_slice($results, 0, 10);
                    $rank = 1;
                    foreach ($top10 as $row) {
                        echo "<tr>";
                        echo "<td id='nummurs'>{$rank}</td>";
                        echo "<td id='vardi'>" . htmlspecialchars($row['team']) . "</td>";
                        echo "<td id='laiki'>{$row['time']}</td>";
                        echo "<td id='punkti'>{$row['score']}</td>";
                        echo "</tr>";
                        $rank++;
                    }
                } else {
                    echo "<tr><td colspan='4'>Nav rezultātu</td></tr>";
                }
                ?>
            </tbody>
        </table>

        <button class="btn" onclick="location.href='index.html'">Atpakaļ</button>
    </div>
</body>
</html>
