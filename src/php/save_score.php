<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(bool $success, string $message): void {
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}

$name       = isset($_REQUEST['name'])       ? $_REQUEST['name']              : null;
$score      = isset($_REQUEST['score'])      ? $_REQUEST['score']             : null;
$time       = isset($_REQUEST['time'])       ? $_REQUEST['time']              : null;
$token      = isset($_REQUEST['token'])      ? $_REQUEST['token']             : null;
$tasks      = isset($_REQUEST['tasks'])      ? intval($_REQUEST['tasks'])      : 0;
$violations = isset($_REQUEST['violations']) ? intval($_REQUEST['violations']) : 0;
$mode       = isset($_REQUEST['mode'])       ? $_REQUEST['mode']              : 'single';
$gameToken  = isset($_REQUEST['gameToken'])  ? $_REQUEST['gameToken']         : null;
$testScore  = isset($_REQUEST['testScore'])  ? max(0, min(10, intval($_REQUEST['testScore']))) : 0;

if ($name === null) {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    if ($data) {
        $name       = $data['name']       ?? null;
        $score      = $data['score']      ?? null;
        $time       = $data['time']       ?? null;
        $token      = $data['token']      ?? null;
        $tasks      = isset($data['tasks'])      ? intval($data['tasks'])      : 0;
        $violations = isset($data['violations']) ? intval($data['violations']) : 0;
        $mode       = $data['mode']       ?? 'single';
        $testScore  = isset($data['testScore']) ? max(0, min(10, intval($data['testScore']))) : 0;
        $gameToken  = $data['gameToken']  ?? null;
    }
}

if ($name === null || $score === null) {
    respond(false, 'Dati netika saņemti');
}

if (empty($token) || !preg_match('/^[a-z0-9]+-[a-z0-9]+$/', $token)) {
    respond(false, 'Nav derīga spēles sesija');
}

if (empty($gameToken) || !isset($_SESSION['game_token']) || $_SESSION['game_token'] !== $gameToken) {
    respond(false, 'Nav derīga spēles sesija (token)');
}

if (!empty($_SESSION['game_submitted'])) {
    respond(false, 'Rezultāts jau ir saglabāts');
}

if ($tasks < 10) {
    respond(false, 'Spēle nav pabeigta — nepieciešami visi 10 uzdevumi');
}

// Use server-tracked score if available, otherwise clamp client score
$serverScore = isset($_SESSION['game_score']) ? intval($_SESSION['game_score']) : null;
if ($serverScore !== null) {
    $score = $serverScore;
} else {
    $score = intval($score);
}
$score = max(0, min(110, $score + $testScore));

// Compute time from server-side start time
$serverStartTime = isset($_SESSION['game_start_time']) ? intval($_SESSION['game_start_time']) : null;
if ($serverStartTime !== null) {
    $timeInSeconds = time() - $serverStartTime;
} else {
    $time = htmlspecialchars($time ? $time : '00:00');
    $timeInSeconds = 0;
    $timeParts = explode(':', $time);
    if (count($timeParts) === 2) {
        $timeInSeconds = (int)$timeParts[0] * 60 + (int)$timeParts[1];
    } elseif (count($timeParts) === 3) {
        $timeInSeconds = (int)$timeParts[0] * 3600 + (int)$timeParts[1] * 60 + (int)$timeParts[2];
    }
}

if ($timeInSeconds < 30) {
    respond(false, 'Laiks ir pārāk īss (minimums: 30s)');
}

$name = preg_replace('/[^a-zA-Z0-9āčēģīķļņšūžĀČĒĢĪĶĻŅŠŪŽ\s\+]/u', '', $name);
$name = trim(substr($name, 0, 8));
if ($name === '') $name = 'Nezināms';
$name = htmlspecialchars($name);

if ($violations > 3) {
    $name .= '*';
}

$normalizedTime = sprintf('%02d:%02d', floor($timeInSeconds / 60), $timeInSeconds % 60);

$_SESSION['game_submitted'] = true;

$line = $name . '|' . $score . '|' . $normalizedTime . "\n";
$file = ($mode === 'multi')
    ? __DIR__ . '/../data/teams_leaderboard.txt'
    : __DIR__ . '/../data/leaderboard.txt';

if (file_put_contents($file, $line, FILE_APPEND | LOCK_EX) !== false) {
    respond(true, 'Rezultāts saglabāts!');
} else {
    respond(false, 'Nevar ierakstīt failā');
}
?>
