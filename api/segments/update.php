<?php
// /api/segments/update.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$user = requireAuth();
$input = json_decode(file_get_contents('php://input'), true);

$segmentId = intval($input['segment_id'] ?? 0);
$title = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');

if ($segmentId <= 0 || empty($title)) {
    http_response_code(400);
    echo json_encode(['error' => 'Segment ID and title are required']);
    exit;
}

try {
    $db = getDB();
    
    // Get segment info and check permissions
    $stmt = $db->prepare('SELECT created_by, title FROM segments WHERE id = ?');
    $stmt->execute([$segmentId]);
    $segment = $stmt->fetch();
    
    if (!$segment) {
        http_response_code(404);
        echo json_encode(['error' => 'Segment not found']);
        exit;
    }
    
    // Check permissions (owner or admin)
    if ($segment['created_by'] != $user['id'] && !$user['is_admin']) {
        http_response_code(403);
        echo json_encode(['error' => 'Permission denied']);
        exit;
    }
    
    // Update segment
    $updateStmt = $db->prepare('UPDATE segments SET title = ?, description = ? WHERE id = ?');
    $updateStmt->execute([$title, $description, $segmentId]);
    
    echo json_encode([
        'success' => true,
        'message' => 'Segment updated successfully'
    ]);
    
} catch (Exception $e) {
    error_log('Segment update error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update segment']);
}