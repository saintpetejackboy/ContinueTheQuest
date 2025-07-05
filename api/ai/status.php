<?php
// api/ai/status.php
// Check AI system status and API key availability
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

$user = getCurrentUser();
$isAdmin = $user && $user['is_admin'];

// Check if OpenAI API key is configured
$apiKey = getenv('OPENAI_API_KEY');
$apiKeyConfigured = !empty($apiKey);
$apiKeyValid = false;

$response = [
    'success' => true,
    'api_key_configured' => $apiKeyConfigured,
    'api_key_valid' => false
];

// Test API key validity if configured
if ($apiKeyConfigured) {
    $apiKeyValid = testOpenAIKey($apiKey);
    $response['api_key_valid'] = $apiKeyValid;
}

// Add admin debug info if user is admin
if ($isAdmin) {
    if (!$apiKeyConfigured) {
        $response['admin_message'] = 'OpenAI API key is not configured in .env file. Please add OPENAI_API_KEY=your_valid_key_here to enable AI generation.';
    } elseif (!$apiKeyValid) {
        $response['admin_message'] = 'OpenAI API key is configured but appears to be invalid. Please check your API key in the .env file.';
    } else {
        $response['admin_message'] = 'OpenAI API key is configured and valid. AI generation is ready.';
    }
}

jsonResponse($response);

function testOpenAIKey($apiKey) {
    // Simple test request to OpenAI API to validate the key
    $data = [
        'model' => 'gpt-3.5-turbo',
        'messages' => [
            [
                'role' => 'user',
                'content' => 'Hello'
            ]
        ],
        'max_tokens' => 1
    ];
    
    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return $httpCode === 200;
}