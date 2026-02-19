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

// ---------------------------------------------------------------------------
// Grammar-tolerant answer comparison
// Accepts answers with missing Latvian diacritics (e.g. "liepajas" for
// "liepājas") and allows a single-character typo for answers of 6+ characters.
// Note: both $userAnswer and $correct are already mb_strtolower-ed above,
// so only lowercase diacritic mappings are needed here.
// ---------------------------------------------------------------------------
function normalizeDiacritics(string $s): string {
    return str_replace(
        ['ā','č','ē','ģ','ī','ķ','ļ','ņ','š','ū','ž'],
        ['a','c','e','g','i','k','l','n','s','u','z'],
        $s
    );
}

function fuzzyMatchAnswer(string $user, string $correct): bool {
    if ($user === $correct) return true;
    // Diacritic-insensitive comparison
    $nu = normalizeDiacritics($user);
    $nc = normalizeDiacritics($correct);
    if ($nu === $nc) return true;
    // Allow one-character typo for answers of six or more characters
    if (strlen($nc) >= 6 && levenshtein($nu, $nc) === 1) return true;
    return false;
}

// Check against correct answer and all alternatives
$isCorrect = fuzzyMatchAnswer($userAnswer, $correct);
if (!$isCorrect) {
    foreach ($alternatives as $alt) {
        if (fuzzyMatchAnswer($userAnswer, $alt)) {
            $isCorrect = true;
            break;
        }
    }
}

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
        $multiplier = isset($data['multiplier']) ? intval($data['multiplier']) : 1;
        $multiplier = max(1, min(4, $multiplier)); // cap at x4 server-side
        $pts = ($isFinal ? 5 : 10) * $multiplier;
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
