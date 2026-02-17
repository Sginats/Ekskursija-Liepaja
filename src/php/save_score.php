<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");


$name = isset($_REQUEST['name']) ? $_REQUEST['name'] : null;
$score = isset($_REQUEST['score']) ? $_REQUEST['score'] : null;
$time = isset($_REQUEST['time']) ? $_REQUEST['time'] : null;

if ($name === null) {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    if ($data) {
        $name = isset($data['name']) ? $data['name'] : null;
        $score = isset($data['score']) ? $data['score'] : null;
        $time = isset($data['time']) ? $data['time'] : null;
    }
}

if ($name !== null && $score !== null) {
    // Validate and sanitize name
    $name = preg_replace('/[^a-zA-Z0-9āčēģīķļņšūž\s]/u', '', $name);
    $name = substr($name, 0, 8);
    $name = htmlspecialchars($name);
    if ($name == "") $name = "Nezinams";
    
    // Validate score range
    $score = intval($score);
    if ($score > 100) $score = 100; // Max 10 questions × 10 points
    if ($score < -50) $score = -50; // Minimum possible score
    
    // Validate time format (MM:SS) and minimum time
    $time = htmlspecialchars($time ? $time : '00:00');
    $timeInSeconds = 0;
    
    // Support both MM:SS and HH:MM:SS formats
    $timeParts = explode(':', $time);
    if (count($timeParts) === 2) {
        $timeInSeconds = (int)$timeParts[0] * 60 + (int)$timeParts[1];
    } elseif (count($timeParts) === 3) {
        $timeInSeconds = (int)$timeParts[0] * 3600 + (int)$timeParts[1] * 60 + (int)$timeParts[2];
    }
    
    // Minimum time validation: 10 tasks × ~3 seconds minimum per task = 30 seconds
    // This also covers negative and zero times
    $MIN_GAME_TIME = 30;
    if ($timeInSeconds < $MIN_GAME_TIME) {
        echo "Error: Laiks ir pārāk īss, lai būtu reāls (minimums: {$MIN_GAME_TIME}s)";
        exit;
    }
    
    // Normalize time to MM:SS format
    $normalizedMinutes = floor($timeInSeconds / 60);
    $normalizedSeconds = $timeInSeconds % 60;
    $time = sprintf("%02d:%02d", $normalizedMinutes, $normalizedSeconds);

    $line = $name . "|" . $score . "|" . $time . "\n";
    $file = __DIR__ . "/../data/leaderboard.txt";

    if (file_put_contents($file, $line, FILE_APPEND | LOCK_EX) !== false) {
        echo "Success";
    } else {
        echo "Error: Nevar ierakstit faila";
    }
} else {
    echo "Error: Dati netika sanemti. REQUEST masivs: " . json_encode($_REQUEST);
}
?>