<?php
// api/branches/create.php
// Create a new branch under a media entry.
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

header('Content-Type: application/json');

$user = getCurrentUser();
if (!$user) {
    jsonResponse(['success' => false, 'error' => 'Authentication required'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method Not Allowed'], 405);
}

// Use $_POST for form data and $_FILES for file uploads
$mediaId    = isset($_POST['media_id']) ? (int)$_POST['media_id'] : 0;
$branchType = $_POST['branch_type'] ?? '';
$sourceType = $_POST['source_type'] ?? '';
$title      = trim($_POST['title'] ?? '');
$summary    = trim($_POST['summary'] ?? '');
$tags       = isset($_POST['tags']) ? json_decode($_POST['tags'], true) : [];

$coverImage = $_FILES['cover_image'] ?? null;
$coverImageFileName = null;

if (!$mediaId || !$title || !$branchType || !$sourceType) {
    jsonResponse(['success' => false, 'error' => 'Missing required fields'], 400);
}

$db = getDB();
// Verify media exists
$stmt = $db->prepare('SELECT id FROM media WHERE id = ?');
$stmt->execute([$mediaId]);
if (!$stmt->fetchColumn()) {
    jsonResponse(['success' => false, 'error' => 'Media not found'], 404);
}

// Handle cover image upload
if ($coverImage && $coverImage['error'] === UPLOAD_ERR_OK) {
    $uploadDir = getUserUploadDir($user['id']) . '/images';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    $fileExtension = pathinfo($coverImage['name'], PATHINFO_EXTENSION);
    $tempFilePath = $uploadDir . '/temp_' . uniqid() . '.' . $fileExtension;
    if (!move_uploaded_file($coverImage['tmp_name'], $tempFilePath)) {
        jsonResponse(['success' => false, 'error' => 'Failed to move uploaded file'], 500);
    }

    $coverImageFileName = convertToWebp($tempFilePath, $uploadDir, $coverImage['name']);
    if (!$coverImageFileName) {
        unlink($tempFilePath); // Clean up temp file
        jsonResponse(['success' => false, 'error' => 'Failed to convert image to WebP'], 500);
    }
}

// Check for new tags that will cost credits
$totalCost = 0;
$newUserTags = [];

if (!empty($tags)) {
    // Check which user tags are new
    $placeholders = str_repeat('?,', count($tags) - 1) . '?';
    $tagCheckStmt = $db->prepare("SELECT name FROM Tags WHERE name IN ($placeholders)");
    $tagCheckStmt->execute($tags);
    $existingTags = $tagCheckStmt->fetchAll(PDO::FETCH_COLUMN);
    
    $newUserTags = array_diff($tags, $existingTags);
    $totalCost = count($newUserTags); // 1 credit per new tag
}

if ($user['credits'] < $totalCost) {
    jsonResponse(['success' => false, 'error' => "Insufficient credits. Need $totalCost credits for new tags"], 400);
}

try {
    // Start database transaction
    $db->beginTransaction();
    
    // Insert branch
    $stmt = $db->prepare(
        'INSERT INTO branches (media_id, title, summary, branch_type, source_type, cover_image, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?)' 
    );
    $stmt->execute([$mediaId, $title, $summary, $branchType, $sourceType, $coverImageFileName, $user['id']]);
    $branchId = (int)$db->lastInsertId();
    
    // Handle tags
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
        $logStmt->execute([$user['id'], -$creditsUsed, "Branch creation - new tags", $branchId]);
    }
    
    $db->commit();
    
    jsonResponse([
        'success'     => true,
        'branch_id'   => $branchId,
        'credits_used' => $creditsUsed,
        'new_tags'    => $newUserTags
    ]);
    
} catch (Exception $e) {
    $db->rollBack();
    error_log('Branch creation error: ' . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Failed to create branch'], 500);
}