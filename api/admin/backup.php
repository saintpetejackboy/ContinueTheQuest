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

if ($method === 'GET') {
    // List recent backups
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
    
    try {
        $stmt = $db->prepare('
            SELECT b.*, u.username as created_by_username 
            FROM backups b 
            LEFT JOIN users u ON b.created_by = u.id 
            ORDER BY b.created_at DESC 
            LIMIT ?
        ');
        $stmt->execute([$limit]);
        $backups = $stmt->fetchAll();
        
        // Format file sizes
        foreach ($backups as &$backup) {
            if ($backup['file_size']) {
                $backup['file_size_formatted'] = formatFileSize($backup['file_size']);
            }
        }
        
        echo json_encode([
            'success' => true,
            'backups' => $backups
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching backups: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch backups']);
    }
    
} elseif ($method === 'POST') {
    // Create new backup
    $data = json_decode(file_get_contents('php://input'), true);
    $backupType = $data['type'] ?? 'database';
    
    if (!in_array($backupType, ['database', 'files', 'full'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid backup type']);
        exit;
    }
    
    try {
        // Create backup record
        $stmt = $db->prepare('
            INSERT INTO backups (backup_type, filename, status, created_by) 
            VALUES (?, ?, "in_progress", ?)
        ');
        
        $timestamp = date('Y-m-d_H-i-s');
        $filename = "backup_{$backupType}_{$timestamp}";
        
        $stmt->execute([$backupType, $filename, $user['id']]);
        $backupId = $db->lastInsertId();
        
        // In a real implementation, you would trigger the actual backup process here
        // For now, we'll just mark it as completed
        $stmt = $db->prepare('
            UPDATE backups 
            SET status = "completed", completed_at = NOW(), file_size = ? 
            WHERE id = ?
        ');
        $stmt->execute([1024, $backupId]); // Placeholder size
        
        echo json_encode([
            'success' => true,
            'backup_id' => $backupId,
            'message' => 'Backup initiated successfully'
        ]);
        
    } catch (Exception $e) {
        error_log("Error creating backup: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create backup']);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

/**
 * Format file size for display
 */
function formatFileSize($bytes) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    return round($bytes, 2) . ' ' . $units[$pow];
}
?>