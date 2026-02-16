<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$file = __DIR__ . '/../data/lobbies.json';
if (!file_exists($file)) file_put_contents($file, json_encode([]));

$action = $_GET['action'] ?? '';
$code = $_GET['code'] ?? '';
$role = $_GET['role'] ?? '';

$lobbies = json_decode(file_get_contents($file), true) ?? [];

if ($action == 'create') {
    // Validate code is numeric and 4 digits
    $code = preg_replace('/[^0-9]/', '', $code);
    if (!$code || strlen($code) != 4) $code = rand(1000, 9999);
    
    $lobbies[$code] = [
        'status' => 'waiting',
        'host_task_done' => false,
        'guest_task_done' => false,
        'created_at' => time()
    ];
    file_put_contents($file, json_encode($lobbies));
    echo json_encode(['status' => 'success', 'code' => $code]);
} 
elseif ($action == 'join') {
    if (isset($lobbies[$code]) && $lobbies[$code]['status'] == 'waiting') {
        $lobbies[$code]['status'] = 'ready';
        file_put_contents($file, json_encode($lobbies));
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error']);
    }
} 
elseif ($action == 'check') {
    echo json_encode(['status' => $lobbies[$code]['status'] ?? 'error']);
} 
elseif ($action == 'update_game') {
    if (isset($lobbies[$code])) {
        if ($role == 'host') $lobbies[$code]['host_task_done'] = true;
        if ($role == 'guest') $lobbies[$code]['guest_task_done'] = true;
        file_put_contents($file, json_encode($lobbies));
        echo json_encode(['status' => 'success']);
    }
} 
elseif ($action == 'get_state') {
    if (isset($lobbies[$code])) {
        echo json_encode([
            'host_done' => $lobbies[$code]['host_task_done'],
            'guest_done' => $lobbies[$code]['guest_task_done']
        ]);
    }
} 
elseif ($action == 'reset_task') {
    if (isset($lobbies[$code])) {
        $lobbies[$code]['host_task_done'] = false;
        $lobbies[$code]['guest_task_done'] = false;
        file_put_contents($file, json_encode($lobbies));
        echo json_encode(['status' => 'reset']);
    }
}
?>