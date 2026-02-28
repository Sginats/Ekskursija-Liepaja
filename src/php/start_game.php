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

// Generate a unique game token
$gameToken = bin2hex(random_bytes(16));

// Store game session data
$_SESSION['game_token'] = $gameToken;
$_SESSION['game_start_time'] = time();
$_SESSION['game_score'] = 0;
$_SESSION['game_tasks'] = 0;
$_SESSION['game_submitted'] = false;
$_SESSION['game_answered'] = [];

echo json_encode(['token' => $gameToken]);
