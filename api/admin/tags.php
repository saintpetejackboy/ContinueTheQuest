<?php
// /api/admin/tags.php
// Admin API for managing tags (CRUD operations)
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');

$user = getCurrentUser();
if (!$user || !isAdmin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden: Admin access required']);
    exit;
}

try {
    $db = getDB();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get all tags with usage statistics for admin
        $stmt = $db->prepare('
            SELECT 
                t.id,
                t.name,
                t.is_genre,
                t.created_by,
                t.created_at,
                COUNT(DISTINCT CASE WHEN tl.target_type = "media" THEN tl.target_id END) as media_count,
                COUNT(DISTINCT CASE WHEN tl.target_type = "branch" THEN tl.target_id END) as branch_count,
                COUNT(DISTINCT CASE WHEN tl.target_type = "segment" THEN tl.target_id END) as segment_count,
                COUNT(DISTINCT tl.id) as usage_count,
                u.username as creator_name
            FROM tags t
            LEFT JOIN tag_links tl ON t.id = tl.tag_id
            LEFT JOIN Users u ON t.created_by = u.id
            GROUP BY t.id, t.name, t.is_genre, t.created_by, t.created_at, u.username
            ORDER BY t.name ASC
        ');
        $stmt->execute();
        $tags = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert is_genre to boolean for JavaScript
        foreach ($tags as &$tag) {
            $tag['is_genre'] = (bool)$tag['is_genre'];
            $tag['media_count'] = (int)$tag['media_count'];
            $tag['branch_count'] = (int)$tag['branch_count'];
            $tag['segment_count'] = (int)$tag['segment_count'];
            $tag['usage_count'] = (int)$tag['usage_count'];
        }
        
        echo json_encode([
            'success' => true,
            'tags' => $tags
        ]);
        exit;
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $action = $data['action'] ?? '';
        
        switch ($action) {
            case 'create':
                $name = trim(strtolower($data['name'] ?? ''));
                $isGenre = isset($data['is_genre']) ? (bool)$data['is_genre'] : false;
                
                if (empty($name)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Tag name is required']);
                    exit;
                }
                
                // Validate tag name (alphanumeric, hyphens, spaces only)
                if (!preg_match('/^[a-z0-9\s\-]+$/i', $name)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Tag name can only contain letters, numbers, spaces, and hyphens']);
                    exit;
                }
                
                // Check if tag name already exists
                $checkStmt = $db->prepare('SELECT id FROM tags WHERE name = ?');
                $checkStmt->execute([$name]);
                if ($checkStmt->fetch()) {
                    http_response_code(409);
                    echo json_encode(['error' => 'A tag with this name already exists']);
                    exit;
                }
                
                $stmt = $db->prepare('
                    INSERT INTO tags (name, is_genre, created_by) 
                    VALUES (?, ?, ?)
                ');
                $stmt->execute([$name, $isGenre ? 1 : 0, $user['id']]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Tag created successfully',
                    'tag_id' => $db->lastInsertId()
                ]);
                break;
                
            case 'update':
                $tagId = intval($data['id'] ?? 0);
                $name = trim(strtolower($data['name'] ?? ''));
                $isGenre = isset($data['is_genre']) ? (bool)$data['is_genre'] : false;
                
                if (!$tagId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Tag ID is required']);
                    exit;
                }
                
                if (empty($name)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Tag name is required']);
                    exit;
                }
                
                // Validate tag name
                if (!preg_match('/^[a-z0-9\s\-]+$/i', $name)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Tag name can only contain letters, numbers, spaces, and hyphens']);
                    exit;
                }
                
                // Check if tag exists
                $checkStmt = $db->prepare('SELECT id FROM tags WHERE id = ?');
                $checkStmt->execute([$tagId]);
                if (!$checkStmt->fetch()) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Tag not found']);
                    exit;
                }
                
                // Check if tag name already exists (excluding current tag)
                $checkStmt = $db->prepare('SELECT id FROM tags WHERE name = ? AND id != ?');
                $checkStmt->execute([$name, $tagId]);
                if ($checkStmt->fetch()) {
                    http_response_code(409);
                    echo json_encode(['error' => 'A tag with this name already exists']);
                    exit;
                }
                
                $stmt = $db->prepare('
                    UPDATE tags 
                    SET name = ?, is_genre = ?
                    WHERE id = ?
                ');
                $stmt->execute([$name, $isGenre ? 1 : 0, $tagId]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Tag updated successfully'
                ]);
                break;
                
            case 'delete':
                $tagId = intval($data['id'] ?? 0);
                
                if (!$tagId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Tag ID is required']);
                    exit;
                }
                
                // Check if tag exists
                $checkStmt = $db->prepare('SELECT id, name FROM tags WHERE id = ?');
                $checkStmt->execute([$tagId]);
                $tag = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$tag) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Tag not found']);
                    exit;
                }
                
                // Begin transaction to delete tag and all its links
                $db->beginTransaction();
                
                try {
                    // Delete all tag links first (foreign key constraint)
                    $stmt = $db->prepare('DELETE FROM tag_links WHERE tag_id = ?');
                    $stmt->execute([$tagId]);
                    
                    // Delete the tag
                    $stmt = $db->prepare('DELETE FROM tags WHERE id = ?');
                    $stmt->execute([$tagId]);
                    
                    $db->commit();
                    
                    echo json_encode([
                        'success' => true,
                        'message' => "Tag '{$tag['name']}' and all its associations deleted successfully"
                    ]);
                } catch (Exception $e) {
                    $db->rollback();
                    throw $e;
                }
                break;
                
            case 'toggle_genre':
                $tagId = intval($data['id'] ?? 0);
                $isGenre = isset($data['is_genre']) ? (bool)$data['is_genre'] : false;
                
                if (!$tagId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Tag ID is required']);
                    exit;
                }
                
                // Check if tag exists
                $checkStmt = $db->prepare('SELECT id, name FROM tags WHERE id = ?');
                $checkStmt->execute([$tagId]);
                $tag = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$tag) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Tag not found']);
                    exit;
                }
                
                $stmt = $db->prepare('UPDATE tags SET is_genre = ? WHERE id = ?');
                $stmt->execute([$isGenre ? 1 : 0, $tagId]);
                
                $statusText = $isGenre ? 'marked as genre' : 'removed from genre';
                echo json_encode([
                    'success' => true,
                    'message' => "Tag '{$tag['name']}' {$statusText} successfully"
                ]);
                break;
                
            case 'bulk_delete':
                $tagIds = $data['tag_ids'] ?? [];
                
                if (!is_array($tagIds) || empty($tagIds)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Tag IDs array is required']);
                    exit;
                }
                
                // Sanitize tag IDs
                $tagIds = array_map('intval', $tagIds);
                $tagIds = array_filter($tagIds, function($id) { return $id > 0; });
                
                if (empty($tagIds)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'No valid tag IDs provided']);
                    exit;
                }
                
                $db->beginTransaction();
                
                try {
                    // Delete all tag links for these tags
                    $placeholders = str_repeat('?,', count($tagIds) - 1) . '?';
                    $stmt = $db->prepare("DELETE FROM tag_links WHERE tag_id IN ($placeholders)");
                    $stmt->execute($tagIds);
                    
                    // Delete the tags
                    $stmt = $db->prepare("DELETE FROM tags WHERE id IN ($placeholders)");
                    $stmt->execute($tagIds);
                    
                    $deletedCount = $stmt->rowCount();
                    $db->commit();
                    
                    echo json_encode([
                        'success' => true,
                        'message' => "$deletedCount tags deleted successfully"
                    ]);
                } catch (Exception $e) {
                    $db->rollback();
                    throw $e;
                }
                break;
                
            case 'bulk_toggle_genre':
                $tagIds = $data['tag_ids'] ?? [];
                $isGenre = isset($data['is_genre']) ? (bool)$data['is_genre'] : false;
                
                if (!is_array($tagIds) || empty($tagIds)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Tag IDs array is required']);
                    exit;
                }
                
                // Sanitize tag IDs
                $tagIds = array_map('intval', $tagIds);
                $tagIds = array_filter($tagIds, function($id) { return $id > 0; });
                
                if (empty($tagIds)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'No valid tag IDs provided']);
                    exit;
                }
                
                $placeholders = str_repeat('?,', count($tagIds) - 1) . '?';
                $stmt = $db->prepare("UPDATE tags SET is_genre = ? WHERE id IN ($placeholders)");
                $stmt->execute(array_merge([$isGenre ? 1 : 0], $tagIds));
                
                $updatedCount = $stmt->rowCount();
                $statusText = $isGenre ? 'marked as genre' : 'removed from genre';
                
                echo json_encode([
                    'success' => true,
                    'message' => "$updatedCount tags {$statusText} successfully"
                ]);
                break;
                
            default:
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action']);
                break;
        }
        exit;
        
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        exit;
    }
    
} catch (Exception $e) {
    if (isset($db) && $db->inTransaction()) {
        $db->rollback();
    }
    error_log("Tags Admin API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
    exit;
}
?>