<?php
// api/branches/remove-cover.php
// Removes the cover image from a branch.
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

$data = json_decode(file_get_contents('php://input'), true) ?: [];
$branchId = isset($data['id']) ? (int)$data['id'] : 0;

if (!$branchId) {
    jsonResponse(['success' => false, 'error' => 'Branch ID is required'], 400);
}

$db = getDB();

try {
    $db->beginTransaction();

    // Fetch current cover image and verify permissions
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

    // Remove file from disk
    if ($currentCoverImage) {
        $imagePath = getUserUploadDir($user['id']) . '/images/' . $currentCoverImage;
        if (file_exists($imagePath)) {
            unlink($imagePath);
        }
    }

    // Update database to set cover_image to NULL
    $stmt = $db->prepare('UPDATE branches SET cover_image = NULL WHERE id = ?');
    $stmt->execute([$branchId]);

    $db->commit();

    jsonResponse(['success' => true, 'message' => 'Cover image removed successfully']);

} catch (Exception $e) {
    $db->rollBack();
    error_log('Remove branch cover error: ' . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Failed to remove cover image'], 500);
}
