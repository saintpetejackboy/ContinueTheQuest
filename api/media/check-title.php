<?php
// /api/media/check-title.php
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
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$title = trim($_GET['title'] ?? '');
if ($title === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Title is required']);
    exit;
}

try {
    $db = getDB();
    // Check exact match
    $stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM media WHERE created_by = ? AND title = ?');
    $stmt->execute([$user['id'], $title]);
    $cntExact = (int)$stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
    if ($cntExact > 0) {
        // Suggest next available variant
        $like = $title . ' (%';
        $stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM media WHERE created_by = ? AND title LIKE ?');
        $stmt->execute([$user['id'], $like]);
        $cntLike = (int)$stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
        $suggestion = $title . ' (' . ($cntLike + 1) . ')';
        echo json_encode(['exists' => true, 'suggestion' => $suggestion]);
    } else {
        echo json_encode(['exists' => false]);
    }
} catch (Exception $e) {
    error_log('check-title error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
exit;