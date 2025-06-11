<?php
// /api/media/clear-cover.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

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

$mediaId = isset($_POST['id']) ? (int)$_POST['id'] : 0;
if ($mediaId < 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid media id']);
    exit;
}

$db = getDB();
try {
    // Only owner or admin can clear cover
    $stmt = $db->prepare('SELECT created_by FROM media WHERE id = ?');
    $stmt->execute([$mediaId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row || ($row['created_by'] != $user['id'] && empty($user['is_admin']))) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        exit;
    }
    $upd = $db->prepare('UPDATE media SET cover_image = NULL WHERE id = ?');
    $upd->execute([$mediaId]);
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}