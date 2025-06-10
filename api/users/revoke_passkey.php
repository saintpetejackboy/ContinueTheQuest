<?php
// /api/users/revoke_passkey.php
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
$passkeyId = $data['passkey_id'] ?? 0;

if (!$passkeyId) {
    http_response_code(400);
    echo json_encode(['error' => 'Passkey ID is required']);
    exit;
}

// Verify user has at least one other passkey or a passphrase set
$db = getDB();

// Check if user has a passphrase
$stmt = $db->prepare("SELECT (passphrase_hash IS NOT NULL) as has_passphrase FROM Users WHERE id = ?");
$stmt->execute([$user['id']]);
$hasPassphrase = $stmt->fetch(PDO::FETCH_ASSOC)['has_passphrase'] ?? false;

// Count user's passkeys
$stmt = $db->prepare("SELECT COUNT(*) as count FROM User_Passkeys WHERE user_id = ?");
$stmt->execute([$user['id']]);
$passkeysCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;

// Verify this is not the user's last authentication method
if (!$hasPassphrase && $passkeysCount <= 1) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Cannot remove your last passkey without a passphrase set. Please set a passphrase first.'
    ]);
    exit;
}

// Delete the passkey
try {
    $stmt = $db->prepare("DELETE FROM User_Passkeys WHERE id = ? AND user_id = ?");
    $stmt->execute([$passkeyId, $user['id']]);
    
    if ($stmt->rowCount() > 0) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Passkey not found or does not belong to you']);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to revoke passkey: ' . $e->getMessage()]);
}
