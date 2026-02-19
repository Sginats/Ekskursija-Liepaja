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

$questionId = isset($data['questionId']) ? trim($data['questionId']) : '';
$userAnswer = isset($data['answer'])     ? trim($data['answer'])     : '';
$sessionId  = isset($data['sessionId'])  ? trim($data['sessionId'])  : '';

// Basic validation
if (empty($questionId) || empty($userAnswer)) {
    echo json_encode(['correct' => false, 'message' => 'Dati nav sanemti']);
    exit;
}

// Sanitise inputs
$questionId = preg_replace('/[^a-z0-9_]/', '', strtolower($questionId));
$userAnswer = mb_strtolower(strip_tags($userAnswer), 'UTF-8');

// Load answers (file is protected by .htaccess — not directly accessible from browser)
$answersFile = __DIR__ . '/../data/answers.json';
if (!file_exists($answersFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'Atbilžu fails nav pieejams']);
    exit;
}

$answers = json_decode(file_get_contents($answersFile), true);
if (!$answers || !isset($answers[$questionId])) {
    echo json_encode(['correct' => false, 'message' => 'Jautājums nav atrasts']);
    exit;
}

$entry        = $answers[$questionId];
$correct      = mb_strtolower($entry['answer'], 'UTF-8');
$alternatives = isset($entry['alt']) ? array_map(
    fn($a) => mb_strtolower($a, 'UTF-8'),
    $entry['alt']
) : [];

// Check exact match or alternative
$isCorrect = ($userAnswer === $correct) || in_array($userAnswer, $alternatives, true);

// Track answers server-side for score verification
$gameToken = isset($data['gameToken']) ? $data['gameToken'] : '';
if (!empty($gameToken) && isset($_SESSION['game_token']) && $_SESSION['game_token'] === $gameToken) {
    if (!isset($_SESSION['game_answered'])) {
        $_SESSION['game_answered'] = [];
    }
    $alreadyAnswered = in_array($questionId, $_SESSION['game_answered'], true);

    if ($isCorrect && !$alreadyAnswered) {
        $_SESSION['game_answered'][] = $questionId;
        $isFinal = isset($data['final']) && $data['final'] === true;
        $pts = $isFinal ? 5 : 10;
        $_SESSION['game_score'] = ($_SESSION['game_score'] ?? 0) + $pts;
        $_SESSION['game_tasks'] = ($_SESSION['game_tasks'] ?? 0) + 1;
    }
}

// Return result — never expose the correct answer on a wrong attempt to prevent enumeration
if ($isCorrect) {
    echo json_encode(['correct' => true, 'correctAnswer' => $entry['answer']]);
} else {
    // On the second wrong attempt the client will request again; we reveal the answer
    // only if the client explicitly signals it is the final attempt.
    $isFinal = isset($data['final']) && $data['final'] === true;
    echo json_encode([
        'correct'       => false,
        'correctAnswer' => $isFinal ? $entry['answer'] : null,
    ]);
}
