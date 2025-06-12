<?php
// /api/comments/count.php
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
    // Check if current user is admin to determine if we should count hidden comments
    $currentUser = getCurrentUser();
    $isAdmin = $currentUser && !empty($currentUser['is_admin']);
    
    if ($isAdmin) {
        // Admins can see count including hidden comments
        $stmt = $db->prepare(
            "SELECT COUNT(*) as count
             FROM comments
             WHERE target_type = ? AND target_id = ?"
        );
        $stmt->execute([$targetType, $targetId]);
    } else {
        // Regular users only see count of visible comments
        $stmt = $db->prepare(
            "SELECT COUNT(*) as count
             FROM comments
             WHERE target_type = ? AND target_id = ? AND hidden = 0"
        );
        $stmt->execute([$targetType, $targetId]);
    }
    
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    $count = (int)$result['count'];
    
    echo json_encode(['count' => $count]);
    
} catch (Exception $e) {
    error_log('Comments count error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}
