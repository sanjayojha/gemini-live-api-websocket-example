<?php

// CORS headers for frontend access
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Your API key
$apiKey = getenv('GEMINI_API_KEY');
if (!$apiKey) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'GEMINI_API_KEY environment variable not set.'
    ]);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $input = json_decode(file_get_contents('php://input'), true);

    $options = [];

    $result = createEphemeralToken($apiKey, $options);

    http_response_code($result['success'] ? 200 : 500);
    echo json_encode($result);
} else {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Method not allowed. Use POST.'
    ]);
}

function createEphemeralToken($apiKey, $options = [])
{

    $defaults = [
        'expireTime' => 5, // minutes
        'newSessionExpireTime' => 1, // minutes
        'uses' => 1, // 0 = unlimited uses
    ];

    $options = array_merge($defaults, $options);

    // Calculate timestamps
    $now = new DateTime('now', new DateTimeZone('UTC'));
    $expireTime = clone $now;
    $expireTime->modify('+' . $options['expireTime'] . ' minutes');

    $newSessionExpireTime = clone $now;
    $newSessionExpireTime->modify('+' . $options['newSessionExpireTime'] . ' minutes');


    $payload = [
        'expireTime' => $expireTime->format('Y-m-d\TH:i:s\Z'),
        'newSessionExpireTime' => $newSessionExpireTime->format('Y-m-d\TH:i:s\Z'),
        'uses' => $options['uses']
    ];

    // API endpoint - MUST use v1alpha
    $url = 'https://generativelanguage.googleapis.com/v1alpha/auth_tokens';

    $ch = curl_init($url);

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'x-goog-api-key: ' . $apiKey
        ],
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_TIMEOUT => 30
    ]);


    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return [
            'success' => false,
            'error' => 'cURL error: ' . $error
        ];
    }

    $data = json_decode($response, true);

    if ($httpCode !== 200) {
        return [
            'success' => false,
            'error' => 'API error',
            'httpCode' => $httpCode,
            'response' => $data
        ];
    }

    // for client
    if (isset($data['name'])) {
        return [
            'success' => true,
            'token' => $data['name'], // Format: auth_tokens/xxx
            'expiry' => $options['expireTime']
        ];
    }

    return [
        'success' => false,
        'error' => 'Invalid response format',
        'response' => $data
    ];
}
