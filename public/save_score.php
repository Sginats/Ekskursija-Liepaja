<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');

$mode = isset($_REQUEST['mode']) ? $_REQUEST['mode'] : 'single';
$name = isset($_REQUEST['name']) ? $_REQUEST['name'] : null;
$score = isset($_REQUEST['score']) ? $_REQUEST['score'] : null;
$time = isset($_REQUEST['time']) ? $_REQUEST['time'] : null;
$players = isset($_REQUEST['players']) ? $_REQUEST['players'] : null;
$player1 = isset($_REQUEST['player1']) ? $_REQUEST['player1'] : null;
$player2 = isset($_REQUEST['player2']) ? $_REQUEST['player2'] : null;

if ($name === null && $players === null) {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    if ($data) {
        $name = isset($data['name']) ? $data['name'] : null;
        $players = isset($data['players']) ? $data['players'] : null;
        $player1 = isset($data['player1']) ? $data['player1'] : null;
        $player2 = isset($data['player2']) ? $data['player2'] : null;
        $score = isset($data['score']) ? $data['score'] : null;
        $time = isset($data['time']) ? $data['time'] : null;
        $mode = isset($data['mode']) ? $data['mode'] : $mode;
    }
}

$score = intval($score);
$time = htmlspecialchars($time ? $time : '00:00');

if ($mode === 'multi') {
    if ($players === null && $player1 !== null && $player2 !== null) {
        $players = $player1 . ' + ' . $player2;
    }
    if ($players === null || $score === null) {
        echo 'Error: Dati netika sanemti.';
        exit;
    }
    $players = htmlspecialchars(trim($players));
    if ($players === '') $players = 'Nezinami + Nezinami';

    $line = $players . '|' . $time . '|' . $score . "\n";
    $file = __DIR__ . '/leaderboard_multi.txt';

    if (file_put_contents($file, $line, FILE_APPEND | LOCK_EX) !== false) {
        echo 'Success';
    } else {
        echo 'Error: Nevar ierakstit faila';
    }
    exit;
}

if ($name !== null && $score !== null) {
    $name = htmlspecialchars(trim($name));
    if ($name == '') $name = 'Nezinams';

    $line = $name . '|' . $score . '|' . $time . "\n";
    $file = __DIR__ . '/leaderboard_single.txt';

    if (file_put_contents($file, $line, FILE_APPEND | LOCK_EX) !== false) {
        echo 'Success';
    } else {
        echo 'Error: Nevar ierakstit faila';
    }
} else {
    echo 'Error: Dati netika sanemti.';
}
?>
