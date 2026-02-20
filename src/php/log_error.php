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
    echo json_encode(['ok' => false]);
    exit;
}

// Rate-limit: max 20 error reports per PHP session to prevent log flooding
if (!isset($_SESSION['bug_count'])) {
    $_SESSION['bug_count'] = 0;
}
if ($_SESSION['bug_count'] >= 20) {
    echo json_encode(['ok' => false, 'reason' => 'rate_limit']);
    exit;
}

$raw = file_get_contents('php://input');
if (empty($raw)) {
    echo json_encode(['ok' => false]);
    exit;
}

$data = json_decode($raw, true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['ok' => false]);
    exit;
}

// Strip pipes and newlines so the pipe-delimited log format stays intact
function sanitizeLogField(string $s): string {
    return str_replace(['|', "\r", "\n", "\t"], [' ', ' ', ' ', ' '], trim($s));
}

$ts      = gmdate('Y-m-d H:i:s') . ' UTC';
$page    = sanitizeLogField(substr(strip_tags($data['page']    ?? ''), 0, 200));
$message = sanitizeLogField(substr(strip_tags($data['message'] ?? ''), 0, 500));
$source  = sanitizeLogField(substr(strip_tags($data['source']  ?? ''), 0, 300));
$lineNo  = max(0, intval($data['line'] ?? 0));
$col     = max(0, intval($data['col']  ?? 0));
$stack   = sanitizeLogField(substr(strip_tags($data['stack']   ?? ''), 0, 1000));
$ua      = sanitizeLogField(substr(strip_tags($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 200));

if (empty($message)) {
    echo json_encode(['ok' => false, 'reason' => 'empty_message']);
    exit;
}

$logFile = __DIR__ . '/../data/bug_log.txt';

// Cap the log file at ~512 KB to prevent unbounded disk use
if (file_exists($logFile) && filesize($logFile) > 524288) {
    echo json_encode(['ok' => false, 'reason' => 'log_full']);
    exit;
}

$record = implode('|', [$ts, $page, $message, $source, $lineNo, $col, $stack, $ua]) . "\n";

if (file_put_contents($logFile, $record, FILE_APPEND | LOCK_EX) !== false) {
    $_SESSION['bug_count']++;
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['ok' => false, 'reason' => 'write_error']);
}
