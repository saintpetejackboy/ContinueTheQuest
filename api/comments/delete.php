<?php
// /api/comments/delete.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

header('Content-Type: application/json');

$user = getCurrentUser();
if (!$user || empty($user['is_admin'])) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden - Admin access required']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$commentId = isset($data['id']) ? (int)$data['id'] : 0;

if ($commentId < 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid comment ID']);
    exit;
}

try {
    $db = getDB();
    $db->beginTransaction();
    
    // First, check if comment exists
    $checkStmt = $db->prepare('SELECT id FROM comments WHERE id = ?');
    $checkStmt->execute([$commentId]);
    if (!$checkStmt->fetch()) {
        $db->rollback();
        http_response_code(404);
        echo json_encode(['error' => 'Comment not found']);
        exit;
    }
    
    // Delete all votes associated with this comment
    $deleteVotesStmt = $db->prepare('DELETE FROM votes WHERE target_type = ? AND target_id = ?');
    $deleteVotesStmt->execute(['comment', $commentId]);
    
    // Delete all replies to this comment (nested comments)
    $deleteRepliesStmt = $db->prepare('DELETE FROM comments WHERE target_type = ? AND target_id = ?');
    $deleteRepliesStmt->execute(['comment', $commentId]);
    
    // Delete the comment itself
    $deleteCommentStmt = $db->prepare('DELETE FROM comments WHERE id = ?');
    $deleteCommentStmt->execute([$commentId]);
    
    $db->commit();
    
    echo json_encode([
        'success' => true, 
        'message' => 'Comment and all associated data permanently deleted'
    ]);
    
} catch (Exception $e) {
    $db->rollback();
    error_log('Comment delete error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error during deletion']);
}
