<?php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

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

// Expected format: /api/admin/analytics/{action}
$action = $pathParts[3] ?? '';

try {
    switch ($action) {
        case 'overview':
            handleOverview($db);
            break;
        case 'top-creators':
            handleTopCreators($db);
            break;
        case 'popular-content':
            handlePopularContent($db);
            break;
        case 'recent-activity':
            handleRecentActivity($db);
            break;
        case 'engagement':
            handleEngagement($db);
            break;
        case 'retention':
            handleRetention($db);
            break;
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Action not found']);
    }
} catch (Exception $e) {
    error_log("Analytics API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}

function handleOverview($db) {
    $stats = [];
    
    // Total users
    $stmt = $db->prepare("SELECT COUNT(*) FROM users");
    $stmt->execute();
    $stats['total_users'] = $stmt->fetchColumn();
    
    // Active users (last 30 days)
    $stmt = $db->prepare("SELECT COUNT(DISTINCT user_id) FROM (
        SELECT created_by as user_id FROM segments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        UNION
        SELECT created_by as user_id FROM comments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        UNION
        SELECT created_by as user_id FROM media WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ) as active_users");
    $stmt->execute();
    $stats['active_users'] = $stmt->fetchColumn();
    
    // Total content pieces
    $stmt = $db->prepare("SELECT 
        (SELECT COUNT(*) FROM segments) +
        (SELECT COUNT(*) FROM comments) +
        (SELECT COUNT(*) FROM media) as total_content");
    $stmt->execute();
    $stats['total_content'] = $stmt->fetchColumn();
    
    // Engagement rate (users who created content vs total users)
    $engagement_rate = $stats['total_users'] > 0 ? 
        round(($stats['active_users'] / $stats['total_users']) * 100, 1) : 0;
    $stats['engagement_rate'] = $engagement_rate;
    
    echo json_encode(['success' => true, 'stats' => $stats]);
}

function handleTopCreators($db) {
    $stmt = $db->prepare("
        SELECT u.username, COUNT(*) as content_count
        FROM users u
        LEFT JOIN (
            SELECT created_by FROM segments
            UNION ALL
            SELECT created_by FROM comments
            UNION ALL
            SELECT created_by FROM media
        ) as content ON u.id = content.created_by
        WHERE content.created_by IS NOT NULL
        GROUP BY u.id, u.username
        ORDER BY content_count DESC
        LIMIT 10
    ");
    $stmt->execute();
    $creators = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'creators' => $creators]);
}

function handlePopularContent($db) {
    $content = [];
    
    // Get popular segments (by comment count)
    $stmt = $db->prepare("
        SELECT s.id, s.title, 'segment' as type, COUNT(c.id) as comments, 0 as views
        FROM segments s
        LEFT JOIN comments c ON s.id = c.segment_id
        GROUP BY s.id, s.title
        ORDER BY comments DESC
        LIMIT 5
    ");
    $stmt->execute();
    $segments = $stmt->fetchAll();
    
    // Get popular media (by view count if available, otherwise by creation date)
    $stmt = $db->prepare("
        SELECT m.id, m.title, 'media' as type, 0 as comments, 0 as views
        FROM media m
        ORDER BY m.created_at DESC
        LIMIT 5
    ");
    $stmt->execute();
    $media = $stmt->fetchAll();
    
    // Combine and sort
    $content = array_merge($segments, $media);
    usort($content, function($a, $b) {
        return ($b['comments'] + $b['views']) - ($a['comments'] + $a['views']);
    });
    
    $content = array_slice($content, 0, 10);
    
    echo json_encode(['success' => true, 'content' => $content]);
}

function handleRecentActivity($db) {
    $stmt = $db->prepare("
        SELECT 'created_segment' as action, u.username, s.created_at
        FROM segments s
        JOIN users u ON s.created_by = u.id
        WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        
        UNION ALL
        
        SELECT 'created_comment' as action, u.username, c.created_at
        FROM comments c
        JOIN users u ON c.created_by = u.id
        WHERE c.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        
        UNION ALL
        
        SELECT 'created_media' as action, u.username, m.created_at
        FROM media m
        JOIN users u ON m.created_by = u.id
        WHERE m.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        
        ORDER BY created_at DESC
        LIMIT 20
    ");
    $stmt->execute();
    $activity = $stmt->fetchAll();
    
    echo json_encode(['success' => true, 'activity' => $activity]);
}

function handleEngagement($db) {
    $metrics = [];
    
    // Total comments
    $stmt = $db->prepare("SELECT COUNT(*) FROM comments");
    $stmt->execute();
    $metrics['total_comments'] = $stmt->fetchColumn();
    
    // Total media
    $stmt = $db->prepare("SELECT COUNT(*) FROM media");
    $stmt->execute();
    $metrics['total_media'] = $stmt->fetchColumn();
    
    // Total tags
    $stmt = $db->prepare("SELECT COUNT(*) FROM tags");
    $stmt->execute();
    $metrics['total_tags'] = $stmt->fetchColumn();
    
    echo json_encode(['success' => true, 'metrics' => $metrics]);
}

function handleRetention($db) {
    $retention = [];
    
    // New users in last 7 days
    $stmt = $db->prepare("SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)");
    $stmt->execute();
    $retention['new_users_7d'] = $stmt->fetchColumn();
    
    // New users in previous 7 days for trend calculation
    $stmt = $db->prepare("SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)");
    $stmt->execute();
    $prev_new_users = $stmt->fetchColumn();
    
    // Calculate trend
    $new_users_trend = $prev_new_users > 0 ? 
        round((($retention['new_users_7d'] - $prev_new_users) / $prev_new_users) * 100, 1) : 0;
    $retention['new_users_trend'] = $new_users_trend;
    
    // Returning users (users who created content in last 30 days and have been registered for more than 30 days)
    $stmt = $db->prepare("
        SELECT COUNT(DISTINCT u.id) 
        FROM users u
        JOIN (
            SELECT created_by FROM segments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            UNION
            SELECT created_by FROM comments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            UNION
            SELECT created_by FROM media WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ) as active ON u.id = active.created_by
        WHERE u.created_at <= DATE_SUB(NOW(), INTERVAL 30 DAY)
    ");
    $stmt->execute();
    $retention['returning_users'] = $stmt->fetchColumn();
    
    // Previous month returning users for trend
    $stmt = $db->prepare("
        SELECT COUNT(DISTINCT u.id) 
        FROM users u
        JOIN (
            SELECT created_by FROM segments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
            UNION
            SELECT created_by FROM comments WHERE created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
            UNION
            SELECT created_by FROM media WHERE created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY) AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
        ) as active ON u.id = active.created_by
        WHERE u.created_at <= DATE_SUB(NOW(), INTERVAL 60 DAY)
    ");
    $stmt->execute();
    $prev_returning = $stmt->fetchColumn();
    
    $returning_trend = $prev_returning > 0 ? 
        round((($retention['returning_users'] - $prev_returning) / $prev_returning) * 100, 1) : 0;
    $retention['returning_trend'] = $returning_trend;
    
    echo json_encode(['success' => true, 'retention' => $retention]);
}
?>