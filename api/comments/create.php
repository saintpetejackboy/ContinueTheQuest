<?php
// /api/comments/create.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';
require_once __DIR__ . '/../../includes/rate_limit.php';

header('Content-Type: application/json');

// Apply rate limiting: 20 comments per minute
applyRateLimit(20, 60);

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
    $db->beginTransaction();
    
    // Insert the comment
    $stmt = $db->prepare(
        'INSERT INTO comments (user_id, target_type, target_id, body, is_anonymous, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())'
    );
    $stmt->execute([$user['id'], $targetType, $targetId, $body, $isAnon ? 1 : 0]);
    $commentId = $db->lastInsertId();
    
    // Fetch the complete comment data including user info
    $stmt = $db->prepare(
        'SELECT c.id, c.body, c.is_anonymous, c.created_at, c.vote_score, c.hidden,
                c.target_type, c.target_id,
                u.username, u.avatar
         FROM comments c
         LEFT JOIN users u ON c.user_id = u.id
         WHERE c.id = ?'
    );
    $stmt->execute([$commentId]);
    $comment = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$comment) {
        throw new Exception('Failed to retrieve created comment');
    }
    
    // Format the comment data for frontend consumption
    $commentData = [
        'id' => (int)$comment['id'],
        'body' => $comment['body'],
        'username' => $comment['username'],
        'avatar' => $comment['avatar'],
        'is_anonymous' => (bool)$comment['is_anonymous'],
        'created_at' => $comment['created_at'],
        'vote_score' => (int)$comment['vote_score'],
        'hidden' => (bool)$comment['hidden'],
        'target_type' => $comment['target_type'],
        'target_id' => (int)$comment['target_id']
    ];
    
    $db->commit();
    
    echo json_encode([
        'success' => true, 
        'comment_id' => (int)$commentId,  // Keep for backward compatibility
        'comment' => $commentData         // New: full comment data for real-time updates
    ]);
    
} catch (Exception $e) {
    $db->rollBack();
    error_log('Comment create error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}