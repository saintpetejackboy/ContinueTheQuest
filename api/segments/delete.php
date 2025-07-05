<?php
// /api/segments/delete.php
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

if ($segmentId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Segment ID is required']);
    exit;
}

try {
    $db = getDB();
    
    // Get segment info and check permissions
    $stmt = $db->prepare('SELECT created_by, file_path, image_path FROM segments WHERE id = ?');
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
    
    // Start transaction
    $db->beginTransaction();
    
    try {
        // Delete related records first
        
        // Delete comments
        $deleteCommentsStmt = $db->prepare('DELETE FROM comments WHERE target_type = ? AND target_id = ?');
        $deleteCommentsStmt->execute(['segment', $segmentId]);
        
        // Delete votes
        $deleteVotesStmt = $db->prepare('DELETE FROM votes WHERE target_type = ? AND target_id = ?');
        $deleteVotesStmt->execute(['segment', $segmentId]);
        
        // Delete tag links
        $deleteTagLinksStmt = $db->prepare('DELETE FROM tag_links WHERE target_type = ? AND target_id = ?');
        $deleteTagLinksStmt->execute(['segment', $segmentId]);
        
        // Delete the segment record
        $deleteSegmentStmt = $db->prepare('DELETE FROM segments WHERE id = ?');
        $deleteSegmentStmt->execute([$segmentId]);
        
        // Commit the transaction
        $db->commit();
        
        // Delete associated files from filesystem
        $userDir = "/var/www/ctq/uploads/users/{$segment['created_by']}";
        
        // Delete segment text file
        if ($segment['file_path']) {
            $textPath = "$userDir/{$segment['file_path']}";
            if (file_exists($textPath)) {
                unlink($textPath);
            }
        }
        
        // Delete segment image file
        if ($segment['image_path']) {
            $imagePath = "$userDir/{$segment['image_path']}";
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Segment deleted successfully'
        ]);
        
    } catch (Exception $e) {
        $db->rollBack();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log('Segment delete error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to delete segment']);
}