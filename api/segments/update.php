<?php
// api/segments/update.php
// Update a segment entry.
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

$segmentId = isset($_POST['segment_id']) ? (int)$_POST['segment_id'] : 0;
$title = trim($_POST['title'] ?? '');
$description = trim($_POST['description'] ?? '');
$content = $_POST['content'] ?? null; // Content is optional for update if not changed
$fileType = $_POST['file_type'] ?? null; // File type is optional for update

$imageFile = $_FILES['image'] ?? null;
$removeImage = isset($_POST['remove_image']) && $_POST['remove_image'] === 'true';

if (!$segmentId || !$title) {
    jsonResponse(['success' => false, 'error' => 'Missing required fields'], 400);
}

$db = getDB();

// Verify segment exists and user has permission to edit
$stmt = $db->prepare('SELECT created_by, file_path, image_path FROM segments WHERE id = ?');
$stmt->execute([$segmentId]);
$segment = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$segment) {
    jsonResponse(['success' => false, 'error' => 'Segment not found'], 404);
}

if ($segment['created_by'] !== $user['id'] && !$user['is_admin']) {
    jsonResponse(['success' => false, 'error' => 'Permission denied'], 403);
}

$currentContentFilePath = $segment['file_path'];
$currentImageFilePath = $segment['image_path'];

$newContentFileName = $currentContentFilePath;
$newImageFileName = $currentImageFilePath;

try {
    $db->beginTransaction();

    // Handle content update
    if ($content !== null) {
        $segmentContentDir = getUserUploadDir($user['id']) . '/segments';
        if (!is_dir($segmentContentDir)) {
            mkdir($segmentContentDir, 0777, true);
        }

        // Remove old content file
        if ($currentContentFilePath && file_exists($segmentContentDir . '/' . $currentContentFilePath)) {
            unlink($segmentContentDir . '/' . $currentContentFilePath);
        }

        // Save new content to file
        $newContentFileName = uniqid('segment_content_') . '.' . ($fileType ?? pathinfo($currentContentFilePath, PATHINFO_EXTENSION));
        $newContentFullPath = $segmentContentDir . '/' . $newContentFileName;
        if (file_put_contents($newContentFullPath, $content) === false) {
            throw new Exception('Failed to save updated segment content');
        }
    }

    // Handle image removal
    if ($removeImage && $currentImageFilePath) {
        $oldImagePath = getUserUploadDir($user['id']) . '/images/' . $currentImageFilePath;
        if (file_exists($oldImagePath)) {
            unlink($oldImagePath);
        }
        $newImageFileName = null;
    }

    // Handle new image upload
    if ($imageFile && $imageFile['error'] === UPLOAD_ERR_OK) {
        // Remove old image if it exists and was not already removed
        if ($currentImageFilePath && !$removeImage) {
            $oldImagePath = getUserUploadDir($user['id']) . '/images/' . $currentImageFilePath;
            if (file_exists($oldImagePath)) {
                unlink($oldImagePath);
            }
        }

        $uploadDir = getUserUploadDir($user['id']) . '/images';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }
        $fileExtension = pathinfo($imageFile['name'], PATHINFO_EXTENSION);
        $tempFilePath = $uploadDir . '/temp_' . uniqid() . '.' . $fileExtension;
        if (!move_uploaded_file($imageFile['tmp_name'], $tempFilePath)) {
            throw new Exception('Failed to move uploaded image file');
        }

        $newImageFileName = convertToWebp($tempFilePath, $uploadDir, $imageFile['name']);
        if (!$newImageFileName) {
            unlink($tempFilePath); // Clean up temp file
            throw new Exception('Failed to convert image to WebP');
        }
    }

    // Update segment details in database
    $stmt = $db->prepare(
        'UPDATE segments SET title = ?, description = ?, file_path = ?, image_path = ? WHERE id = ?'
    );
    $stmt->execute([$title, $description, $newContentFileName, $newImageFileName, $segmentId]);

    $db->commit();

    jsonResponse([
        'success' => true,
        'segment_id' => $segmentId,
        'new_file_path' => $newContentFileName,
        'new_image_path' => $newImageFileName
    ]);

} catch (Exception $e) {
    $db->rollBack();
    error_log('Segment update error: ' . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Failed to update segment: ' . $e->getMessage()], 500);
}
