<?php
// /api/branches/update-tags.php
// Update tags for a branch
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
$tags = isset($input['tags']) ? (array)$input['tags'] : [];

// Clean and validate tags
$tags = array_filter(array_map('trim', $tags));
$tags = array_unique($tags);

if ($branchId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid branch ID']);
    exit;
}

try {
    $db = getDB();
    
    // Check if user can edit this branch
    $stmt = $db->prepare('SELECT created_by FROM branches WHERE id = ?');
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
    
    // Check for new tags that will cost credits
    $totalCost = 0;
    $newUserTags = [];
    
    if (!empty($tags)) {
        // Check which user tags are new
        $placeholders = str_repeat('?,', count($tags) - 1) . '?';
        $tagCheckStmt = $db->prepare("SELECT name FROM tags WHERE name IN ($placeholders)");
        $tagCheckStmt->execute(array_values($tags)); // Ensure array values are sequential
        $existingTags = $tagCheckStmt->fetchAll(PDO::FETCH_COLUMN);
        
        $newUserTags = array_diff($tags, $existingTags);
        $totalCost = count($newUserTags); // 1 credit per new tag
    }
    
    if ($user['credits'] < $totalCost) {
        http_response_code(400);
        echo json_encode(['error' => "Insufficient credits. Need $totalCost credits for new tags"]);
        exit;
    }
    
    // Start database transaction
    $db->beginTransaction();
    
    // Remove all existing tags for this branch
    $deleteStmt = $db->prepare('DELETE FROM tag_links WHERE target_type = "branch" AND target_id = ?');
    $deleteStmt->execute([$branchId]);
    
    // Add new tags
    $creditsUsed = 0;
    foreach ($tags as $tagName) {
        // Check if tag exists
        $tagStmt = $db->prepare('SELECT id FROM tags WHERE name = ?');
        $tagStmt->execute([$tagName]);
        $tagId = $tagStmt->fetchColumn();
        
        if (!$tagId) {
            // Create new user tag (costs credit)
            $tagStmt = $db->prepare('INSERT INTO tags (name, created_by, created_at) VALUES (?, ?, NOW())');
            $tagStmt->execute([$tagName, $user['id']]);
            $tagId = $db->lastInsertId();
            $creditsUsed++;
        }
        
        // Link to branch (all branch tags are user tags, not mandatory)
        $linkStmt = $db->prepare('INSERT INTO tag_links (tag_id, target_type, target_id, tagged_by, tagged_at, is_mandatory) VALUES (?, ?, ?, ?, NOW(), 0)');
        $linkStmt->execute([$tagId, 'branch', $branchId, $user['id']]);
    }
    
    // Deduct credits if any were used
    if ($creditsUsed > 0) {
        $creditStmt = $db->prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
        $creditStmt->execute([$creditsUsed, $user['id']]);
        
        // Log credit transaction
        $logStmt = $db->prepare('INSERT INTO credits_log (user_id, change_amount, reason, related_id, created_at) VALUES (?, ?, ?, ?, NOW())');
        $logStmt->execute([$user['id'], -$creditsUsed, "Branch tag update - new tags", $branchId]);
    }
    
    $db->commit();
    
    echo json_encode([
        'success' => true,
        'credits_used' => $creditsUsed,
        'new_tags' => $newUserTags,
        'message' => 'Tags updated successfully'
    ]);
    
} catch (Exception $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log('Branch tag update error: ' . $e->getMessage() . ' | File: ' . $e->getFile() . ' | Line: ' . $e->getLine());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update tags: ' . $e->getMessage()]);
}
?>