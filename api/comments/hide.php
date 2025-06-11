<?php
// /api/comments/hide.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

header('Content-Type: application/json');
$user = getCurrentUser();
if (!$user || empty($user['is_admin'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$commentId = isset($data['id']) ? (int)$data['id'] : 0;
$action = isset($data['action']) && $data['action'] === 'unhide' ? 'unhide' : 'hide';
$hidden = $action === 'hide' ? 1 : 0;

try {
    $db = getDB();
    $stmt = $db->prepare('UPDATE comments SET hidden = ? WHERE id = ?');
    $stmt->execute([$hidden, $commentId]);
    echo json_encode(['success' => true, 'hidden' => $hidden]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}