<?php
// api/branches/update.php
// Update a branch entry.
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
$branchId   = isset($_POST['id']) ? (int)$_POST['id'] : 0;
$title      = trim($_POST['title'] ?? '');
$summary    = trim($_POST['summary'] ?? '');
$branchType = $_POST['branch_type'] ?? '';
$sourceType = $_POST['source_type'] ?? '';
$tags       = isset($_POST['tags']) ? json_decode($_POST['tags'], true) : [];

$coverImage = $_FILES['cover_image'] ?? null;
$removeCover = isset($_POST['remove_cover']) && $_POST['remove_cover'] === 'true';

if (!$branchId || !$title || !$branchType || !$sourceType) {
    jsonResponse(['success' => false, 'error' => 'Missing required fields'], 400);
}

$db = getDB();

// Verify branch exists and user has permission to edit
$stmt = $db->prepare('SELECT created_by, cover_image FROM branches WHERE id = ?');
$stmt->execute([$branchId]);
$branch = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$branch) {
    jsonResponse(['success' => false, 'error' => 'Branch not found'], 404);
}

if ($branch['created_by'] !== $user['id'] && !$user['is_admin']) {
    jsonResponse(['success' => false, 'error' => 'Permission denied'], 403);
}

$currentCoverImage = $branch['cover_image'];
$newCoverImageFileName = $currentCoverImage;

try {
    $db->beginTransaction();

    // Handle cover image removal
    if ($removeCover && $currentCoverImage) {
        $oldImagePath = getUserUploadDir($user['id']) . '/images/' . $currentCoverImage;
        if (file_exists($oldImagePath)) {
            unlink($oldImagePath);
        }
        $newCoverImageFileName = null;
    }

    // Handle new cover image upload
    if ($coverImage && $coverImage['error'] === UPLOAD_ERR_OK) {
        // Remove old image if it exists
        if ($currentCoverImage) {
            $oldImagePath = getUserUploadDir($user['id']) . '/images/' . $currentCoverImage;
            if (file_exists($oldImagePath)) {
                unlink($oldImagePath);
            }
        }

        $uploadDir = getUserUploadDir($user['id']) . '/images';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        $fileExtension = pathinfo($coverImage['name'], PATHINFO_EXTENSION);
        $tempFilePath = $uploadDir . '/temp_' . uniqid() . '.' . $fileExtension;
        if (!move_uploaded_file($coverImage['tmp_name'], $tempFilePath)) {
            throw new Exception('Failed to move uploaded file');
        }

        $newCoverImageFileName = convertToWebp($tempFilePath, $uploadDir, $coverImage['name']);
        if (!$newCoverImageFileName) {
            unlink($tempFilePath); // Clean up temp file
            throw new Exception('Failed to convert image to WebP');
        }
    }

    // Update branch details
    $stmt = $db->prepare(
        'UPDATE branches SET title = ?, summary = ?, branch_type = ?, source_type = ?, cover_image = ? WHERE id = ?'
    );
    $stmt->execute([$title, $summary, $branchType, $sourceType, $newCoverImageFileName, $branchId]);

    // Handle tags (remove existing and re-add)
    $deleteTagsStmt = $db->prepare('DELETE FROM tag_links WHERE target_type = ? AND target_id = ? AND is_mandatory = 0');
    $deleteTagsStmt->execute(['branch', $branchId]);

    $creditsUsed = 0;
    foreach ($tags as $tagName) {
        $tagStmt = $db->prepare('SELECT id FROM tags WHERE name = ?');
        $tagStmt->execute([$tagName]);
        $tagId = $tagStmt->fetchColumn();

        if (!$tagId) {
            $tagStmt = $db->prepare('INSERT INTO tags (name, created_by, created_at) VALUES (?, ?, NOW())');
            $tagStmt->execute([$tagName, $user['id']]);
            $tagId = $db->lastInsertId();
            $creditsUsed++;
        }

        $linkStmt = $db->prepare('INSERT INTO tag_links (tag_id, target_type, target_id, tagged_by, tagged_at, is_mandatory) VALUES (?, ?, ?, ?, NOW(), 0)');
        $linkStmt->execute([$tagId, 'branch', $branchId, $user['id']]);
    }

    // Deduct credits if any were used (only for new tags created during update)
    if ($creditsUsed > 0) {
        $creditStmt = $db->prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
        $creditStmt->execute([$creditsUsed, $user['id']]);
        $logStmt = $db->prepare('INSERT INTO credits_log (user_id, change_amount, reason, related_id, created_at) VALUES (?, ?, ?, ?, NOW())');
        $logStmt->execute([$user['id'], -$creditsUsed, "Branch update - new tags", $branchId]);
    }

    $db->commit();

    jsonResponse([
        'success' => true,
        'branch_id' => $branchId,
        'credits_used' => $creditsUsed,
        'new_cover_image' => $newCoverImageFileName
    ]);

} catch (Exception $e) {
    $db->rollBack();
    error_log('Branch update error: ' . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Failed to update branch: ' . $e->getMessage()], 500);
}