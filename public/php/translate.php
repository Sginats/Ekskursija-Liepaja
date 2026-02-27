<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Production: Set this in your environment or a secure config file
$authKey = getenv('DEEPL_API_KEY') ?: "REPLACE_WITH_YOUR_KEY"; 

if ($authKey === "REPLACE_WITH_YOUR_KEY") {
    // For local dev fallback or error
    // error_log("DeepL API Key missing");
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
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

$response = curl_exec($ch);

if(curl_errno($ch)){
    http_response_code(500);
    echo json_encode(['error' => curl_error($ch)]);
} else {
    $statusCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($statusCode >= 400) {
        http_response_code($statusCode);
        echo $response;
    } else {
        echo $response;
    }
}

curl_close($ch);
?>