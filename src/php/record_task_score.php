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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$raw  = file_get_contents('php://input');
$data = json_decode($raw, true);

$gameToken = isset($data['gameToken']) ? trim($data['gameToken']) : '';
$taskId    = isset($data['taskId'])    ? trim($data['taskId'])    : '';
$points    = isset($data['points'])    ? intval($data['points'])  : 0;

if (empty($gameToken) || empty($taskId)) {
    echo json_encode(['error' => 'Trūkst obligātie lauki']);
    exit;
}

// Validate game token
if (!isset($_SESSION['game_token']) || $_SESSION['game_token'] !== $gameToken) {
    echo json_encode(['error' => 'Nav derīgs spēles token']);
    exit;
}

// Sanitise task ID
$taskId = preg_replace('/[^a-zA-Z0-9]/', '', $taskId);

// Allowed non-quiz tasks and their maximum points
$allowedTasks = [
    'RTU'     => 10,
    'Osta'    => 15,
    'Mols'    => 15,
    'Teatris' => 10,
];

if (!array_key_exists($taskId, $allowedTasks)) {
    echo json_encode(['error' => 'Nezināms uzdevums']);
    exit;
}

// Clamp points to the allowed maximum
$maxPts = $allowedTasks[$taskId];
$points = max(0, min($maxPts, $points));

// Prevent duplicate task recordings
if (!isset($_SESSION['game_answered'])) {
    $_SESSION['game_answered'] = [];
}

if (in_array($taskId, $_SESSION['game_answered'], true)) {
    echo json_encode(['success' => false, 'message' => 'Uzdevums jau reģistrēts']);
    exit;
}

// Record completion and update server-side score
$_SESSION['game_answered'][] = $taskId;
$_SESSION['game_score'] = ($_SESSION['game_score'] ?? 0) + $points;
$_SESSION['game_tasks'] = ($_SESSION['game_tasks'] ?? 0) + 1;

echo json_encode(['success' => true, 'score' => $_SESSION['game_score']]);
?>
