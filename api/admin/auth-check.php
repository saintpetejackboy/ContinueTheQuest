<?php
require_once __DIR__ . '/../../bootstrap.php';

// Get current user
$user = getCurrentUser();

// Check if user is logged in and is admin
if (!$user || !$user['is_admin']) {
    http_response_code(403);
    echo json_encode(['error' => 'Admin access required']);
    exit;
}

// User is authenticated as admin
http_response_code(200);
echo json_encode(['success' => true, 'user' => $user['username']]);