<?php
// /api/comments/get.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$targetType = $_GET['target_type'] ?? '';
$targetId = isset($_GET['target_id']) ? (int)$_GET['target_id'] : 0;
$allowedTypes = ['media', 'branch', 'segment', 'comment'];
if (!in_array($targetType, $allowedTypes, true) || $targetId < 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$db = getDB();
try {
    // Fetch comments (include hidden comments for admins)
    $currentUser = getCurrentUser();
    $isAdmin = $currentUser && !empty($currentUser['is_admin']);
    if ($isAdmin) {
        $stmt = $db->prepare(
            'SELECT id, user_id, body, is_anonymous, vote_score, hidden, created_at
             FROM comments
             WHERE target_type = ? AND target_id = ?
             ORDER BY created_at ASC'
        );
        $stmt->execute([$targetType, $targetId]);
    } else {
        $stmt = $db->prepare(
            'SELECT id, user_id, body, is_anonymous, vote_score, created_at
             FROM comments
             WHERE target_type = ? AND target_id = ? AND hidden = 0
             ORDER BY created_at ASC'
        );
        $stmt->execute([$targetType, $targetId]);
    }
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $comments = [];
    foreach ($rows as $row) {
        $comment = [
            'id' => (int)$row['id'],
            'user_id' => (int)$row['user_id'],
            'body' => $row['body'],
            'is_anonymous' => (bool)$row['is_anonymous'],
            'vote_score' => (int)$row['vote_score'],
            'created_at' => $row['created_at']
        ];
        if (isset($row['hidden'])) {
            $comment['hidden'] = (bool)$row['hidden'];
        }
        if (!$comment['is_anonymous']) {
            $userStmt = $db->prepare('SELECT username, avatar FROM users WHERE id = ?');
            $userStmt->execute([$row['user_id']]);
            $u = $userStmt->fetch(PDO::FETCH_ASSOC);
            if ($u) {
                $comment['username'] = $u['username'];
                $comment['avatar_url'] = $u['avatar']
                    ? "/uploads/users/{$row['user_id']}/avatars/{$u['avatar']}"
                    : null;
            }
        }
        $comments[] = $comment;
    }
    echo json_encode(['comments' => $comments]);
} catch (Exception $e) {
    error_log('Comments get error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}