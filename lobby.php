<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$file = 'lobbies.json';

// Ja fails neeksistē, izveidojam tukšu
if (!file_exists($file)) {
    file_put_contents($file, json_encode([]));
}

$action = isset($_GET['action']) ? $_GET['action'] : '';
$code = isset($_GET['code']) ? $_GET['code'] : '';

// Ielādējam esošās istabas
$lobbies = json_decode(file_get_contents($file), true);
if (!is_array($lobbies)) $lobbies = [];

// --- 1. IZVEIDOT ISTABU (CREATE) ---
if ($action == 'create') {
    // Ģenerē jaunu kodu, ja nav norādīts
    if (!$code) $code = rand(1000, 9999);
    
    $lobbies[$code] = [
        'status' => 'waiting', // Gaida spēlētāju
        'created_at' => time()
    ];
    
    saveLobbies($file, $lobbies);
    echo json_encode(['status' => 'success', 'code' => $code]);
}

// --- 2. PIEVIENOTIES ISTABAI (JOIN) ---
elseif ($action == 'join') {
    if (isset($lobbies[$code]) && $lobbies[$code]['status'] == 'waiting') {
        $lobbies[$code]['status'] = 'ready'; // Istaba ir pilna
        saveLobbies($file, $lobbies);
        echo json_encode(['status' => 'success']);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Istaba neeksistē vai ir pilna']);
    }
}

// --- 3. PĀRBAUDĪT STATUSU (CHECK) - Priekš Hostētāja ---
elseif ($action == 'check') {
    if (isset($lobbies[$code])) {
        echo json_encode(['status' => $lobbies[$code]['status']]);
    } else {
        echo json_encode(['status' => 'error']);
    }
}

else {
    echo json_encode(['status' => 'error', 'message' => 'Nezināma darbība']);
}

// Palīgfunkcija saglabāšanai
function saveLobbies($file, $data) {
    // Dzēšam vecās istabas (vecākas par 1 stundu), lai fails neuzpūšas
    foreach ($data as $c => $info) {
        if (time() - $info['created_at'] > 3600) {
            unset($data[$c]);
        }
    }
    file_put_contents($file, json_encode($data));
}
?>