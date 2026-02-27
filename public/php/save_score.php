<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");


$name = isset($_REQUEST['name']) ? $_REQUEST['name'] : null;
$score = isset($_REQUEST['score']) ? $_REQUEST['score'] : null;
$time = isset($_REQUEST['time']) ? $_REQUEST['time'] : null;

if ($name === null) {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    if ($data) {
        $name = isset($data['name']) ? $data['name'] : null;
        $score = isset($data['score']) ? $data['score'] : null;
        $time = isset($data['time']) ? $data['time'] : null;
    }
}

if ($name !== null && $score !== null) {
    $name = htmlspecialchars($name);
    $score = intval($score);
    $time = htmlspecialchars($time ? $time : '00:00:00');

    if ($name == "") $name = "Nezinams";

    $line = $name . "|" . $score . "|" . $time . "\n";
    $file = __DIR__ . "/../data/leaderboard.txt";

    if (file_put_contents($file, $line, FILE_APPEND | LOCK_EX) !== false) {
        echo "Success";
    } else {
        echo "Error: Nevar ierakstit faila";
    }
} else {
    echo "Error: Dati netika sanemti. REQUEST masivs: " . json_encode($_REQUEST);
}
?>