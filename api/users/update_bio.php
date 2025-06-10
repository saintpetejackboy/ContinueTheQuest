<?php
// /api/users/update_bio.php
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
$bio = $data['bio'] ?? '';

// Sanitize and limit bio
$bio = htmlspecialchars(trim($bio), ENT_QUOTES, 'UTF-8');
if (mb_strlen($bio) > 500) {
    $bio = mb_substr($bio, 0, 500);
}

try {
    $db = getDB();
    $stmt = $db->prepare("UPDATE Users SET bio = ? WHERE id = ?");
    $stmt->execute([$bio, $user['id']]);
    
    echo json_encode(['success' => true, 'bio' => $bio]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update bio: ' . $e->getMessage()]);
}
