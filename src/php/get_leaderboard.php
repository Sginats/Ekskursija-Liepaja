<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function parseLeaderboardFile(string $file): array {
    $results = [];
    if (!file_exists($file)) return $results;
    $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $parts = explode('|', $line);
        if (count($parts) >= 3) {
            $timeParts    = explode(':', trim($parts[2]));
            $timeInSeconds = 0;
            if (count($timeParts) === 2) {
                $timeInSeconds = (int)$timeParts[0] * 60 + (int)$timeParts[1];
            } elseif (count($timeParts) === 3) {
                $timeInSeconds = (int)$timeParts[0] * 3600 + (int)$timeParts[1] * 60 + (int)$timeParts[2];
            }
            $results[] = [
                'name'          => htmlspecialchars(trim($parts[0]), ENT_QUOTES, 'UTF-8'),
                'score'         => (int)$parts[1],
                'time'          => sprintf('%02d:%02d', floor($timeInSeconds / 60), $timeInSeconds % 60),
                'timeInSeconds' => $timeInSeconds,
            ];
        }
    }
    return $results;
}

$singleFile = __DIR__ . '/../data/leaderboard.txt';
$teamsFile  = __DIR__ . '/../data/teams_leaderboard.txt';

echo json_encode([
    'single' => parseLeaderboardFile($singleFile),
    'teams'  => parseLeaderboardFile($teamsFile),
], JSON_UNESCAPED_UNICODE);
?>
