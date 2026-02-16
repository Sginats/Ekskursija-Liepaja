<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$authKey = getenv('DEEPL_AUTH_KEY');
$text = $_GET['text'] ?? '';
$targetLang = $_GET['target'] ?? 'EN';

if (!$text) {
    echo json_encode(['translations' => [['text' => '']]]);
    exit;
}

// If no API key is configured, return original text (fallback mode)
if (!$authKey) {
    echo json_encode(['translations' => [['text' => $text]]]);
    exit;
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://api-free.deepl.com/v2/translate");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'auth_key' => $authKey,
    'text' => $text,
    'target_lang' => $targetLang
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);

if (curl_errno($ch)) {
    // On error, fallback to original text
    echo json_encode(['translations' => [['text' => $text]]]);
} else {
    echo $response;
}

curl_close($ch);
?>