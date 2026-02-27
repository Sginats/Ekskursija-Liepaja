<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$file = __DIR__ . '/lobbies.json';
if (!file_exists($file)) {
    file_put_contents($file, json_encode([]));
}

function load_lobbies($file) {
    $raw = file_get_contents($file);
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function save_lobbies($file, $lobbies) {
    file_put_contents($file, json_encode($lobbies));
}

function sanitize_name($name) {
    $name = trim($name ?? '');
    $name = preg_replace('/\s+/', ' ', $name);
    if ($name === '') return '';
    if (strlen($name) < 2 || strlen($name) > 16) return '';
    if (!preg_match('/^[\p{L}0-9 \-]+$/u', $name)) return '';
    return $name;
}

$action = $_GET['action'] ?? '';
$code = $_GET['code'] ?? '';
$playerId = $_GET['playerId'] ?? '';
$name = sanitize_name($_GET['name'] ?? '');
$role = $_GET['role'] ?? '';
$ready = isset($_GET['ready']) ? filter_var($_GET['ready'], FILTER_VALIDATE_BOOLEAN) : null;
$scoreDelta = isset($_GET['score']) ? intval($_GET['score']) : 0;
$routeJson = $_GET['route'] ?? '';

$lobbies = load_lobbies($file);

function lobby_response($lobby, $code) {
    return [
        'status' => $lobby['status'],
        'code' => $code,
        'players' => [
            'host' => [
                'name' => $lobby['players']['host']['name'] ?? null,
                'ready' => $lobby['players']['host']['ready'] ?? false
            ],
            'guest' => [
                'name' => $lobby['players']['guest']['name'] ?? null,
                'ready' => $lobby['players']['guest']['ready'] ?? false
            ]
        ],
        'route' => $lobby['route'],
        'progressIndex' => $lobby['progressIndex'],
        'scores' => $lobby['scores'],
        'start_time' => $lobby['start_time']
    ];
}

if ($action === 'create') {
    if ($name === '' || $playerId === '') {
        echo json_encode(['status' => 'error', 'message' => 'invalid_name']);
        exit;
    }
    $code = strval(rand(1000, 9999));
    $lobbies[$code] = [
        'status' => 'waiting',
        'players' => [
            'host' => ['id' => $playerId, 'name' => $name, 'ready' => false],
            'guest' => ['id' => '', 'name' => '', 'ready' => false]
        ],
        'route' => [],
        'progressIndex' => 0,
        'host_task_done' => false,
        'guest_task_done' => false,
        'scores' => ['host' => 0, 'guest' => 0],
        'created_at' => time(),
        'start_time' => null
    ];
    save_lobbies($file, $lobbies);
    echo json_encode(['status' => 'success', 'code' => $code]);
    exit;
}

if (!isset($lobbies[$code])) {
    echo json_encode(['status' => 'error', 'message' => 'no_lobby']);
    exit;
}

$lobby = $lobbies[$code];

if ($action === 'join') {
    if ($name === '' || $playerId === '') {
        echo json_encode(['status' => 'error', 'message' => 'invalid_name']);
        exit;
    }
    if ($lobby['players']['guest']['id'] === '' || $lobby['players']['guest']['id'] === $playerId) {
        $lobby['players']['guest'] = ['id' => $playerId, 'name' => $name, 'ready' => false];
        $lobby['status'] = 'ready';
        $lobbies[$code] = $lobby;
        save_lobbies($file, $lobbies);
        echo json_encode(['status' => 'success']);
        exit;
    }
    echo json_encode(['status' => 'error', 'message' => 'full']);
    exit;
}

if ($action === 'set_ready') {
    if ($playerId === '') {
        echo json_encode(['status' => 'error', 'message' => 'no_player']);
        exit;
    }
    if ($lobby['players']['host']['id'] === $playerId) {
        $lobby['players']['host']['ready'] = (bool)$ready;
    } elseif ($lobby['players']['guest']['id'] === $playerId) {
        $lobby['players']['guest']['ready'] = (bool)$ready;
    }
    $lobbies[$code] = $lobby;
    save_lobbies($file, $lobbies);
    echo json_encode(['status' => 'success']);
    exit;
}

if ($action === 'start_game') {
    $hostReady = $lobby['players']['host']['ready'];
    $guestReady = $lobby['players']['guest']['ready'];
    if ($hostReady && $guestReady) {
        $lobby['status'] = 'in_game';
        $lobby['start_time'] = time();
        $lobbies[$code] = $lobby;
        save_lobbies($file, $lobbies);
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'not_ready']);
    }
    exit;
}

if ($action === 'set_route') {
    if ($routeJson !== '') {
        $route = json_decode($routeJson, true);
        if (is_array($route)) {
            $lobby['route'] = $route;
        }
    }
    $lobbies[$code] = $lobby;
    save_lobbies($file, $lobbies);
    echo json_encode(['status' => 'success']);
    exit;
}

if ($action === 'complete_task') {
    if ($playerId === '') {
        echo json_encode(['status' => 'error', 'message' => 'no_player']);
        exit;
    }
    if ($lobby['players']['host']['id'] === $playerId) {
        $lobby['host_task_done'] = true;
        $lobby['scores']['host'] += max(0, $scoreDelta);
    } elseif ($lobby['players']['guest']['id'] === $playerId) {
        $lobby['guest_task_done'] = true;
        $lobby['scores']['guest'] += max(0, $scoreDelta);
    }

    $bothDone = $lobby['host_task_done'] && $lobby['guest_task_done'];
    if ($bothDone) {
        $lobby['progressIndex'] += 1;
        $lobby['host_task_done'] = false;
        $lobby['guest_task_done'] = false;
    }

    $lobbies[$code] = $lobby;
    save_lobbies($file, $lobbies);
    echo json_encode(['status' => 'success', 'bothDone' => $bothDone, 'progressIndex' => $lobby['progressIndex'], 'scores' => $lobby['scores']]);
    exit;
}

if ($action === 'get_lobby') {
    echo json_encode(lobby_response($lobby, $code));
    exit;
}

if ($action === 'get_state') {
    echo json_encode([
        'host_done' => $lobby['host_task_done'],
        'guest_done' => $lobby['guest_task_done'],
        'progressIndex' => $lobby['progressIndex'],
        'route' => $lobby['route'],
        'scores' => $lobby['scores'],
        'start_time' => $lobby['start_time']
    ]);
    exit;
}

echo json_encode(['status' => 'error', 'message' => 'unknown_action']);
?>
