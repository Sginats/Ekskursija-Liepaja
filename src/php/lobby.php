<?php
session_start();
header("Access-Control-Allow-Origin: https://kristovskis.lv");
header("Vary: Origin");
header("Content-Type: application/json");

$file = __DIR__ . '/../data/lobbies.json';
if (!file_exists($file)) file_put_contents($file, json_encode([]));

$action = $_GET['action'] ?? '';
$code = $_GET['code'] ?? '';
$role = $_GET['role'] ?? '';
$token = $_GET['token'] ?? '';

function isLobbyMember(array $lobby, string $token, string $role): bool {
    if ($token === '' || !isset($lobby[$role . '_token'])) return false;
    return hash_equals($lobby[$role . '_token'], $token);
}

$lobbies = json_decode(file_get_contents($file), true) ?? [];

if ($action == 'create') {
    $code = preg_replace('/[^0-9]/', '', $code);
    if (!$code || strlen($code) != 4) $code = rand(1000, 9999);
    
    $lobbies[$code] = [
        'status' => 'waiting',
        'host_task_done' => false,
        'guest_task_done' => false,
        'created_at' => time(),
        'host_token' => bin2hex(random_bytes(32)),
        'guest_token' => null
    ];
    file_put_contents($file, json_encode($lobbies), LOCK_EX);
    echo json_encode(['status' => 'success', 'code' => $code, 'token' => $lobbies[$code]['host_token']]);
} 
elseif ($action == 'join') {
    if (isset($lobbies[$code]) && $lobbies[$code]['status'] == 'waiting') {
        $lobbies[$code]['status'] = 'ready';
        $lobbies[$code]['guest_token'] = bin2hex(random_bytes(32));
        file_put_contents($file, json_encode($lobbies), LOCK_EX);
        echo json_encode(['status' => 'success', 'token' => $lobbies[$code]['guest_token']]);
    } else {
        echo json_encode(['status' => 'error']);
    }
} 
elseif ($action == 'check') {
    $lobby = $lobbies[$code] ?? null;
    echo json_encode([
        'status' => $lobby && isLobbyMember($lobby, $token, $role) ? $lobby['status'] : 'error'
    ]);
}
elseif ($action == 'update_game') {
    if (isset($lobbies[$code]) && isLobbyMember($lobbies[$code], $token, $role)) {
        if ($role == 'host') $lobbies[$code]['host_task_done'] = true;
        if ($role == 'guest') $lobbies[$code]['guest_task_done'] = true;
        file_put_contents($file, json_encode($lobbies), LOCK_EX);
        echo json_encode(['status' => 'success']);
    }
} 
elseif ($action == 'get_state') {
    if (isset($lobbies[$code]) && isLobbyMember($lobbies[$code], $token, $role)) {
        echo json_encode([
            'host_done' => $lobbies[$code]['host_task_done'],
            'guest_done' => $lobbies[$code]['guest_task_done']
        ]);
    }
} 
elseif ($action == 'reset_task') {
    if (isset($lobbies[$code]) && isLobbyMember($lobbies[$code], $token, $role)) {
        $lobbies[$code]['host_task_done'] = false;
        $lobbies[$code]['guest_task_done'] = false;
        file_put_contents($file, json_encode($lobbies), LOCK_EX);
        echo json_encode(['status' => 'reset']);
    }
}
?>