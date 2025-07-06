<?php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/csrf.php';

// Ensure only admins can access
$user = getCurrentUser();
if (!$user || !$user['is_admin']) {
    http_response_code(403);
    echo json_encode(['error' => 'Admin access required']);
    exit;
}

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// Parse the request URI to determine the action
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Expected format: /api/admin/moderation/{action}/{id?}
$action = $pathParts[3] ?? '';
$id = $pathParts[4] ?? null;

try {
    switch ($action) {
        case 'stats':
            handleStats($db);
            break;
        case 'flagged':
            handleFlagged($db);
            break;
        case 'reports':
            handleReports($db);
            break;
        case 'recent':
            handleRecent($db);
            break;
        case 'banned':
            handleBanned($db);
            break;
        case 'approve':
            requireCSRFToken();
            handleApprove($db, $id);
            break;
        case 'remove':
            requireCSRFToken();
            handleRemove($db, $id);
            break;
        case 'resolve':
            requireCSRFToken();
            handleResolve($db, $id);
            break;
        case 'unban':
            requireCSRFToken();
            handleUnban($db, $id);
            break;
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Action not found']);
    }
} catch (Exception $e) {
    error_log("Moderation API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}

function handleStats($db) {
    $stats = [
        'pending' => 0,
        'flagged' => 0,
        'reports' => 0,
        'banned' => 0
    ];
    
    // Get flagged content count
    $stmt = $db->prepare("SELECT COUNT(*) FROM admin_moderation WHERE status = 'flagged'");
    $stmt->execute();
    $stats['flagged'] = $stmt->fetchColumn();
    
    // Get pending items count
    $stmt = $db->prepare("SELECT COUNT(*) FROM admin_moderation WHERE status = 'pending'");
    $stmt->execute();
    $stats['pending'] = $stmt->fetchColumn();
    
    // Get active reports count (assuming a reports table exists)
    $stmt = $db->prepare("SELECT COUNT(*) FROM admin_moderation WHERE content_type = 'report' AND status = 'active'");
    $stmt->execute();
    $stats['reports'] = $stmt->fetchColumn();
    
    // Get banned users count
    $stmt = $db->prepare("SELECT COUNT(*) FROM users WHERE is_banned = 1");
    $stmt->execute();
    $stats['banned'] = $stmt->fetchColumn();
    
    echo json_encode(['success' => true, 'stats' => $stats]);
}

function handleFlagged($db) {
    $stmt = $db->prepare("
        SELECT am.*, u.username, 
               CASE 
                   WHEN am.content_type = 'segment' THEN s.title
                   WHEN am.content_type = 'comment' THEN CONCAT('Comment: ', SUBSTRING(c.content, 1, 50))
                   WHEN am.content_type = 'media' THEN m.title
                   WHEN am.content_type = 'branch' THEN b.title
                   ELSE 'Unknown Content'
               END as title
        FROM admin_moderation am
        LEFT JOIN users u ON am.user_id = u.id
        LEFT JOIN segments s ON am.content_type = 'segment' AND am.content_id = s.id
        LEFT JOIN comments c ON am.content_type = 'comment' AND am.content_id = c.id
        LEFT JOIN media m ON am.content_type = 'media' AND am.content_id = m.id
        LEFT JOIN branches b ON am.content_type = 'branch' AND am.content_id = b.id
        WHERE am.status = 'flagged'
        ORDER BY am.created_at DESC
        LIMIT 50
    ");
    $stmt->execute();
    $items = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'items' => $items]);
}

function handleReports($db) {
    $stmt = $db->prepare("
        SELECT am.*, u.username as reporter_username
        FROM admin_moderation am
        LEFT JOIN users u ON am.user_id = u.id
        WHERE am.content_type = 'report' AND am.status = 'active'
        ORDER BY am.created_at DESC
        LIMIT 50
    ");
    $stmt->execute();
    $items = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'items' => $items]);
}

function handleRecent($db) {
    $stmt = $db->prepare("
        SELECT am.*, u.username,
               CASE 
                   WHEN am.content_type = 'segment' THEN s.title
                   WHEN am.content_type = 'comment' THEN 'Comment Activity'
                   WHEN am.content_type = 'media' THEN m.title
                   WHEN am.content_type = 'branch' THEN b.title
                   ELSE 'Activity'
               END as title
        FROM admin_moderation am
        LEFT JOIN users u ON am.user_id = u.id
        LEFT JOIN segments s ON am.content_type = 'segment' AND am.content_id = s.id
        LEFT JOIN comments c ON am.content_type = 'comment' AND am.content_id = c.id
        LEFT JOIN media m ON am.content_type = 'media' AND am.content_id = m.id
        LEFT JOIN branches b ON am.content_type = 'branch' AND am.content_id = b.id
        ORDER BY am.created_at DESC
        LIMIT 50
    ");
    $stmt->execute();
    $items = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'items' => $items]);
}

function handleBanned($db) {
    $stmt = $db->prepare("
        SELECT u.id as user_id, u.username, u.banned_at, u.ban_reason as reason,
               banned_by.username as banned_by_username
        FROM users u
        LEFT JOIN users banned_by ON u.banned_by = banned_by.id
        WHERE u.is_banned = 1
        ORDER BY u.banned_at DESC
        LIMIT 50
    ");
    $stmt->execute();
    $items = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'items' => $items]);
}

function handleApprove($db, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        return;
    }
    
    $stmt = $db->prepare("UPDATE admin_moderation SET status = 'approved' WHERE id = ?");
    $stmt->execute([$id]);
    
    echo json_encode(['success' => true, 'message' => 'Content approved']);
}

function handleRemove($db, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        return;
    }
    
    $stmt = $db->prepare("UPDATE admin_moderation SET status = 'removed' WHERE id = ?");
    $stmt->execute([$id]);
    
    echo json_encode(['success' => true, 'message' => 'Content removed']);
}

function handleResolve($db, $id) {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        return;
    }
    
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? 'dismissed';
    
    $stmt = $db->prepare("UPDATE admin_moderation SET status = ? WHERE id = ?");
    $stmt->execute([$action, $id]);
    
    echo json_encode(['success' => true, 'message' => 'Report resolved']);
}

function handleUnban($db, $userId) {
    if (!$userId) {
        http_response_code(400);
        echo json_encode(['error' => 'User ID required']);
        return;
    }
    
    $stmt = $db->prepare("UPDATE users SET is_banned = 0, banned_at = NULL, ban_reason = NULL, banned_by = NULL WHERE id = ?");
    $stmt->execute([$userId]);
    
    echo json_encode(['success' => true, 'message' => 'User unbanned']);
}
?>