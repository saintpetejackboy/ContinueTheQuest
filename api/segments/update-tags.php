<?php
// api/segments/update-tags.php
// Update tags for a specific segment
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/coin.php';

// Ensure user is logged in
$currentUser = getCurrentUser();
if (!$currentUser) {
    jsonResponse(['success' => false, 'error' => 'Authentication required'], 401);
}

// Get request data
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['segment_id']) || !isset($input['tags'])) {
    jsonResponse(['success' => false, 'error' => 'Missing required data'], 400);
}

$segmentId = (int)$input['segment_id'];
$newTags = array_map('trim', $input['tags']);
$newTags = array_filter($newTags); // Remove empty tags

if (!$segmentId) {
    jsonResponse(['success' => false, 'error' => 'Invalid segment ID'], 400);
}

$db = getDB();

// Check if segment exists and user has permission to edit
$stmt = $db->prepare(
    'SELECT s.id, s.created_by, b.created_by as branch_owner
     FROM segments s
     JOIN branches b ON b.id = s.branch_id
     WHERE s.id = ?'
);
$stmt->execute([$segmentId]);
$segment = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$segment) {
    jsonResponse(['success' => false, 'error' => 'Segment not found'], 404);
}

// Check permissions: segment creator, branch owner, or admin
$canEdit = $currentUser['is_admin'] || 
           $currentUser['id'] == $segment['created_by'] || 
           $currentUser['id'] == $segment['branch_owner'];

if (!$canEdit) {
    jsonResponse(['success' => false, 'error' => 'Permission denied'], 403);
}

try {
    $db->beginTransaction();
    
    // Get existing tags to determine which are new
    $stmt = $db->prepare('SELECT LOWER(name) as name FROM tags');
    $stmt->execute();
    $existingTags = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'name');
    
    $creditsNeeded = 0;
    $newTagNames = [];
    
    // Check which tags are new (case-insensitive)
    foreach ($newTags as $tagName) {
        if (!in_array(strtolower($tagName), $existingTags)) {
            $creditsNeeded++;
            $newTagNames[] = $tagName;
        }
    }
    
    // Check if user has enough credits for new tags
    if ($creditsNeeded > 0 && $currentUser['credits'] < $creditsNeeded) {
        $db->rollback();
        jsonResponse(['success' => false, 'error' => "Insufficient credits. Need {$creditsNeeded} credits for new tags, but only have {$currentUser['credits']}."], 400);
    }
    
    // Create new tags first
    $newTagIds = [];
    foreach ($newTagNames as $tagName) {
        $stmt = $db->prepare('INSERT INTO tags (name, created_by) VALUES (?, ?)');
        $stmt->execute([$tagName, $currentUser['id']]);
        $newTagIds[$tagName] = $db->lastInsertId();
    }
    
    // Deduct credits for new tags
    if ($creditsNeeded > 0) {
        $stmt = $db->prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
        $stmt->execute([$creditsNeeded, $currentUser['id']]);
        
        // Log credit transaction
        logCreditTransaction($currentUser['id'], -$creditsNeeded, 'tag_creation', "Created {$creditsNeeded} new tags for segment {$segmentId}");
    }
    
    // Remove all existing tag links for this segment (except mandatory ones)
    $stmt = $db->prepare('DELETE FROM tag_links WHERE target_type = "segment" AND target_id = ? AND is_mandatory = 0');
    $stmt->execute([$segmentId]);
    
    // Add new tag links
    $stmt = $db->prepare('INSERT INTO tag_links (tag_id, target_type, target_id, tagged_by, is_mandatory) VALUES (?, "segment", ?, ?, 0)');
    
    foreach ($newTags as $tagName) {
        // Get tag ID (either existing or newly created)
        if (isset($newTagIds[$tagName])) {
            $tagId = $newTagIds[$tagName];
        } else {
            $stmt2 = $db->prepare('SELECT id FROM tags WHERE LOWER(name) = LOWER(?)');
            $stmt2->execute([$tagName]);
            $tagId = $stmt2->fetchColumn();
        }
        
        if ($tagId) {
            $stmt->execute([$tagId, $segmentId, $currentUser['id']]);
        }
    }
    
    $db->commit();
    
    jsonResponse([
        'success' => true,
        'credits_used' => $creditsNeeded,
        'new_tags_created' => count($newTagNames),
        'message' => 'Tags updated successfully'
    ]);
    
} catch (Exception $e) {
    $db->rollback();
    error_log("Tag update error: " . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Failed to update tags'], 500);
}