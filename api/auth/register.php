<?php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/webauthn.php';

header('Content-Type: application/json');

$data = json_decode(file_get_contents('php://input'), true);
if (!$data || !isset($data['username']) || !isset($data['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Username and email are required.']);
    exit;
}

try {
    $userId = registerUser($data['username'], $data['email']);
    loginUser($userId);
    echo json_encode(['success' => true, 'userId' => $userId]);
} catch (PDOException $e) {
    http_response_code(409);
    echo json_encode(['error' => 'Username or email already exists.']);
}
