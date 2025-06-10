<?php
// /api/users/set_passphrase.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');

$user = getCurrentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$passphrase = $data['passphrase'] ?? '';
$currentPassphrase = $data['current_passphrase'] ?? '';

// Validate passphrase
if (strlen($passphrase) < 8) {
    http_response_code(400);
    echo json_encode(['error' => 'Passphrase must be at least 8 characters']);
    exit;
}

// If user already has a passphrase, verify the current one
$db = getDB();
$stmt = $db->prepare("SELECT passphrase_hash FROM Users WHERE id = ?");
$stmt->execute([$user['id']]);
$result = $stmt->fetch(PDO::FETCH_ASSOC);

if ($result && !empty($result['passphrase_hash'])) {
    // Verify current passphrase
    if (!password_verify($currentPassphrase, $result['passphrase_hash'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Current passphrase is incorrect']);
        exit;
    }
}

// Update with new passphrase
$passphraseHash = password_hash($passphrase, PASSWORD_DEFAULT);
try {
    $stmt = $db->prepare("UPDATE Users SET passphrase_hash = ? WHERE id = ?");
    $stmt->execute([$passphraseHash, $user['id']]);
    
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update passphrase: ' . $e->getMessage()]);
}
