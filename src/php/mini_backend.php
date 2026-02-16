<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$action = $_GET['action'] ?? '';
$game = $_GET['game'] ?? 'unknown';
$file = __DIR__ . "/mini_lb_" . preg_replace('/[^a-z0-9]/', '', $game) . ".txt";

if ($action == 'save') {
    $name = $_GET['name'] ?? 'Anonīms';
    // Validate and sanitize name
    $name = preg_replace('/[^a-zA-Z0-9āčēģīķļņšūž\s]/u', '', $name);
    $name = substr($name, 0, 8);
    if ($name == "") $name = "Anonīms";
    
    $time = $_GET['time'] ?? '99.99';
    // Validate time is reasonable (between 0.01 and 300 seconds)
    $time = floatval($time);
    if ($time < 0.01) $time = 0.01;
    if ($time > 300) $time = 300;
    
    $line = "$name|$time\n";
    file_put_contents($file, $line, FILE_APPEND | LOCK_EX);
    echo json_encode(['status' => 'saved']);
} 
elseif ($action == 'get') {
    if (file_exists($file)) {
        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $results = [];
        foreach ($lines as $line) {
            $parts = explode("|", $line);
            if (count($parts) >= 2) {
                $results[] = ['name' => $parts[0], 'time' => floatval($parts[1])];
            }
        }
        usort($results, function($a, $b) { return $a['time'] <=> $b['time']; });
        echo json_encode(array_slice($results, 0, 5));
    } else {
        echo json_encode([]);
    }
}
?>
