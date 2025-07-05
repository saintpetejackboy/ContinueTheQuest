<?php
// /api/segments/update.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

$user = getCurrentUser();
if (!$user) {
    jsonResponse(['success' => false, 'error' => 'Authentication required'], 401);
}
$input = json_decode(file_get_contents('php://input'), true);

$segmentId = intval($input['segment_id'] ?? 0);
$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');

if ($segmentId <= 0 || empty($title)) {
    jsonResponse(['success' => false, 'error' => 'Segment ID and title are required'], 400);
}

try {
    $db = getDB();
    
    // Get segment info and check permissions
    $stmt = $db->prepare('SELECT created_by, title FROM segments WHERE id = ?');
    $stmt->execute([$segmentId]);
    $segment = $stmt->fetch();
    
    if (!$segment) {
        jsonResponse(['success' => false, 'error' => 'Segment not found'], 404);
    }
    
    // Check permissions (owner or admin)
    if ($segment['created_by'] != $user['id'] && !$user['is_admin']) {
        jsonResponse(['success' => false, 'error' => 'Permission denied'], 403);
    }
    
    // Update segment
    $updateStmt = $db->prepare('UPDATE segments SET title = ?, description = ? WHERE id = ?');
    $updateStmt->execute([$title, $description, $segmentId]);
    
    jsonResponse([
        'success' => true,
        'message' => 'Segment updated successfully'
    ]);
    
} catch (Exception $e) {
    error_log('Segment update error: ' . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Failed to update segment'], 500);
}