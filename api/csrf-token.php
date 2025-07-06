<?php
// API endpoint to get CSRF token
session_start();
require_once __DIR__ . '/../includes/utils.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

echo json_encode(['csrf_token' => generateCSRFToken()]);
