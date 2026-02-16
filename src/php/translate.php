<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$authKey = getenv('DEEPL_AUTH_KEY');

if (!$authKey) {
    http_response_code(503);
    echo json_encode(['error' => 'Translation service temporarily unavailable.']);
    exit;
}

$text = $_GET['text'] ?? '';
$targetLang = $_GET['target'] ?? 'EN';

if (!$text) {
    echo json_encode(['translations' => [['text' => '']]]);
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

if(curl_errno($ch)){
    http_response_code(502);
    echo json_encode(['error' => 'Translation service temporarily unavailable.']);
} else {
    echo $response;
}

curl_close($ch);
?>