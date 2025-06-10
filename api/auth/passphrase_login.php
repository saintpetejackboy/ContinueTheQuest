<?php
// /api/auth/passphrase_login.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

session_start();
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$username = $data['username'] ?? '';
$passphrase = $data['passphrase'] ?? '';

if (!$username || !$passphrase) {
    http_response_code(400);
    echo json_encode(['error' => 'Username and passphrase required']);
    exit;
}

$db = getDB();
$stmt = $db->prepare("SELECT id, passphrase_hash FROM Users WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !$user['passphrase_hash'] || !password_verify($passphrase, $user['passphrase_hash'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    exit;
}

loginUser($user['id']);
echo json_encode(['success' => true]);