<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

function parseLeaderboardFile($file) {
    $results = [];
    if (!file_exists($file)) return $results;
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
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
            $displayMinutes = floor($timeInSeconds / 60);
            $displaySeconds = $timeInSeconds % 60;
            $displayTime = sprintf("%02d:%02d", $displayMinutes, $displaySeconds);
            $results[] = [
                'name'          => htmlspecialchars($parts[0]),
                'score'         => (int)$parts[1],
                'time'          => $displayTime,
                'timeInSeconds' => $timeInSeconds,
            ];
        }
    }
    return $results;
}

$singleFile = __DIR__ . "/../data/leaderboard.txt";
$teamsFile  = __DIR__ . "/../data/teams_leaderboard.txt";

echo json_encode([
    'single' => parseLeaderboardFile($singleFile),
    'teams'  => parseLeaderboardFile($teamsFile),
]);
?>
