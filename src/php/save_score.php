<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");


$name = isset($_REQUEST['name']) ? $_REQUEST['name'] : null;
$score = isset($_REQUEST['score']) ? $_REQUEST['score'] : null;
$time = isset($_REQUEST['time']) ? $_REQUEST['time'] : null;
$token = isset($_REQUEST['token']) ? $_REQUEST['token'] : null;
$tasks = isset($_REQUEST['tasks']) ? intval($_REQUEST['tasks']) : 0;
$violations = isset($_REQUEST['violations']) ? intval($_REQUEST['violations']) : 0;

if ($name === null) {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    if ($data) {
        $name = isset($data['name']) ? $data['name'] : null;
        $score = isset($data['score']) ? $data['score'] : null;
        $time = isset($data['time']) ? $data['time'] : null;
        $token = isset($data['token']) ? $data['token'] : null;
        $tasks = isset($data['tasks']) ? intval($data['tasks']) : 0;
        $violations = isset($data['violations']) ? intval($data['violations']) : 0;
    }
}

if ($name !== null && $score !== null) {
    if (empty($token) || !preg_match('/^[a-z0-9]+-[a-z0-9]+$/', $token)) {
        echo "Error: Nav derīga spēles sesija";
        exit;
    }
    if ($tasks < 10) {
        echo "Error: Spēle nav pabeigta";
        exit;
    }
    $flagged = ($violations > 3);
    $name = preg_replace('/[^a-zA-Z0-9āčēģīķļņšūž\s]/u', '', $name);
    $name = substr($name, 0, 8);
    $name = htmlspecialchars($name);
    if ($name == "") $name = "Nezinams";
    $score = intval($score);
    if ($score > 100) $score = 100;
    if ($score < -50) $score = -50;
    $time = htmlspecialchars($time ? $time : '00:00');
    $timeInSeconds = 0;
    $timeParts = explode(':', $time);
    if (count($timeParts) === 2) {
        $timeInSeconds = (int)$timeParts[0] * 60 + (int)$timeParts[1];
    } elseif (count($timeParts) === 3) {
        $timeInSeconds = (int)$timeParts[0] * 3600 + (int)$timeParts[1] * 60 + (int)$timeParts[2];
    }
    $MIN_GAME_TIME = 30;
    if ($timeInSeconds < $MIN_GAME_TIME) {
        echo "Error: Laiks ir pārāk īss, lai būtu reāls (minimums: {$MIN_GAME_TIME}s)";
        exit;
    }
    $normalizedMinutes = floor($timeInSeconds / 60);
    $normalizedSeconds = $timeInSeconds % 60;
    $time = sprintf("%02d:%02d", $normalizedMinutes, $normalizedSeconds);
    if ($flagged) {
        $name = $name . "*";
    }

    $line = $name . "|" . $score . "|" . $time . "\n";
    $file = __DIR__ . "/../data/leaderboard.txt";

    if (file_put_contents($file, $line, FILE_APPEND | LOCK_EX) !== false) {
        echo "Success";
    } else {
        echo "Error: Nevar ierakstit faila";
    }
} else {
    echo "Error: Dati netika sanemti";
}
?>