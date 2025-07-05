<?php
// /api/branches/remove-cover.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$user = getCurrentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}
$input = json_decode(file_get_contents('php://input'), true);
$branchId = intval($input['branch_id'] ?? 0);

if ($branchId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid branch ID']);
    exit;
}

try {
    $db = getDB();
    
    // Get branch info and check permissions
    $stmt = $db->prepare('SELECT created_by, cover_image FROM branches WHERE id = ?');
    $stmt->execute([$branchId]);
    $branch = $stmt->fetch();
    
    if (!$branch) {
        http_response_code(404);
        echo json_encode(['error' => 'Branch not found']);
        exit;
    }
    
    // Check permissions (owner or admin)
    if ($branch['created_by'] != $user['id'] && !$user['is_admin']) {
        http_response_code(403);
        echo json_encode(['error' => 'Permission denied']);
        exit;
    }
    
    // Check if branch has a cover image
    if (!$branch['cover_image']) {
        http_response_code(400);
        echo json_encode(['error' => 'Branch has no cover image to remove']);
        exit;
    }
    
    // Remove the file from filesystem
    $userDir = "/var/www/ctq/uploads/users/{$branch['created_by']}";
    $imagePath = "$userDir/images/{$branch['cover_image']}";
    
    if (file_exists($imagePath)) {
        unlink($imagePath);
    }
    
    // Update branch record
    $updateStmt = $db->prepare('UPDATE branches SET cover_image = NULL WHERE id = ?');
    $updateStmt->execute([$branchId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Cover image removed successfully'
    ]);
    
} catch (Exception $e) {
    error_log('Branch cover removal error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to remove cover image']);
}