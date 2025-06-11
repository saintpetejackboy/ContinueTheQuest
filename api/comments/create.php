<?php
// /api/comments/create.php
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

$data = json_decode(file_get_contents('php://input'), true);
$targetType = $data['target_type'] ?? '';
$targetId = isset($data['target_id']) ? (int)$data['target_id'] : 0;
$body = trim($data['body'] ?? '');
$isAnon = !empty($data['is_anonymous']);
$allowedTypes = ['media', 'branch', 'segment', 'comment'];
if (!in_array($targetType, $allowedTypes, true) || $targetId < 1 || $body === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$db = getDB();
try {
    $stmt = $db->prepare(
        'INSERT INTO comments (user_id, target_type, target_id, body, is_anonymous)
         VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->execute([$user['id'], $targetType, $targetId, $body, $isAnon ? 1 : 0]);
    $commentId = $db->lastInsertId();
    echo json_encode(['success' => true, 'comment_id' => (int)$commentId]);
} catch (Exception $e) {
    error_log('Comment create error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}