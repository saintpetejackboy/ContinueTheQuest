<?php
// api/ai/status.php
// Check AI system status and API key availability
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

$user = getCurrentUser();
$isAdmin = $user && $user['is_admin'];

// Check if OpenAI API key is configured
$apiKeyConfigured = !empty(getenv('OPENAI_API_KEY'));

$response = [
    'success' => true,
    'api_key_configured' => $apiKeyConfigured
];

// Add admin debug info if user is admin
if ($isAdmin && !$apiKeyConfigured) {
    $response['admin_message'] = 'OpenAI API key is not configured in .env file. Please add OPENAI_API_KEY=your_key_here to enable AI generation.';
}

jsonResponse($response);