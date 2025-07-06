<?php
// api/segments/create.php
// Create a new segment for a branch.
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';
require_once __DIR__ . '/../../includes/rate_limit.php';

header('Content-Type: application/json');

// Apply rate limiting: 10 segment creations per minute
applyRateLimit(10, 60);

$user = getCurrentUser();
if (!$user) {
    jsonResponse(['success' => false, 'error' => 'Authentication required'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method Not Allowed'], 405);
}

$branchId = isset($_POST['branch_id']) ? (int)$_POST['branch_id'] : 0;
$title = trim($_POST['title'] ?? '');
$description = trim($_POST['description'] ?? '');
$content = $_POST['content'] ?? '';
$fileType = $_POST['file_type'] ?? 'md'; // 'md' or 'txt'

$imageFile = $_FILES['image'] ?? null;
$imageFileName = null;

if (!$branchId || !$title || !$content) {
    jsonResponse(['success' => false, 'error' => 'Missing required fields'], 400);
}

$db = getDB();

// Verify branch exists and user has permission to add segments (e.g., is creator or admin)
$stmt = $db->prepare('SELECT created_by FROM branches WHERE id = ?');
$stmt->execute([$branchId]);
$branch = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$branch) {
    jsonResponse(['success' => false, 'error' => 'Branch not found'], 404);
}

// Check user quota before proceeding with file uploads
$userQuota = getUserQuota($user['id']);
$currentUsage = getUserDiskUsage($user['id']);

$contentSize = strlen($content); // Estimate size for content
$imageSize = $imageFile ? $imageFile['size'] : 0;

if (($currentUsage + $contentSize + $imageSize) > $userQuota) {
    jsonResponse(['success' => false, 'error' => 'Storage quota exceeded.'], 400);
}

// Handle image upload
if ($imageFile && $imageFile['error'] === UPLOAD_ERR_OK) {
    $uploadDir = getUserUploadDir($user['id']) . '/images';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    $fileExtension = pathinfo($imageFile['name'], PATHINFO_EXTENSION);
    $tempFilePath = $uploadDir . '/temp_' . uniqid() . '.' . $fileExtension;
    if (!move_uploaded_file($imageFile['tmp_name'], $tempFilePath)) {
        jsonResponse(['success' => false, 'error' => 'Failed to move uploaded image file'], 500);
    }

    $imageFileName = convertToWebp($tempFilePath, $uploadDir, $imageFile['name']);
    if (!$imageFileName) {
        unlink($tempFilePath); // Clean up temp file
        jsonResponse(['success' => false, 'error' => 'Failed to convert image to WebP'], 500);
    }
}

// Save content to file
$segmentContentDir = getUserUploadDir($user['id']) . '/segments';
if (!is_dir($segmentContentDir)) {
    mkdir($segmentContentDir, 0777, true);
}
$contentFileName = uniqid('segment_content_') . '.' . $fileType;
$contentFilePath = $segmentContentDir . '/' . $contentFileName;

if (file_put_contents($contentFilePath, $content) === false) {
    jsonResponse(['success' => false, 'error' => 'Failed to save segment content'], 500);
}

try {
    $db->beginTransaction();

    // Determine the next order_index for the segment within the branch
    $stmt = $db->prepare('SELECT MAX(order_index) FROM segments WHERE branch_id = ?');
    $stmt->execute([$branchId]);
    $maxOrder = $stmt->fetchColumn();
    $orderIndex = ($maxOrder === null) ? 1 : $maxOrder + 1;

    // Insert segment into database
    $stmt = $db->prepare(
        'INSERT INTO segments (branch_id, title, description, file_path, image_path, created_by, order_index, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())'
    );
    $stmt->execute([$branchId, $title, $description, $contentFileName, $imageFileName, $user['id'], $orderIndex]);
    $segmentId = $db->lastInsertId();

    $db->commit();

    jsonResponse(['success' => true, 'segment_id' => $segmentId]);

} catch (Exception $e) {
    $db->rollBack();
    // Clean up uploaded files if DB transaction fails
    if ($imageFileName && file_exists($segmentContentDir . '/' . $imageFileName)) {
        unlink($segmentContentDir . '/' . $imageFileName);
    }
    if (file_exists($contentFilePath)) {
        unlink($contentFilePath);
    }
    error_log('Segment creation error: ' . $e->getMessage());
    jsonResponse(['success' => false, 'error' => 'Failed to create segment: ' . $e->getMessage()], 500);
}
