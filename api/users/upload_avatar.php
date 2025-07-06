<?php
// /api/users/upload_avatar.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';
require_once __DIR__ . '/../../includes/csrf.php';

header('Content-Type: application/json');

$user = getCurrentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Validate CSRF token for file uploads
requireCSRFToken();

// Check if file was uploaded properly
if (!isset($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    $error = isset($_FILES['avatar']) ? $_FILES['avatar']['error'] : 'No file uploaded';
    echo json_encode(['error' => 'Upload failed: ' . $error]);
    exit;
}

// Validate file type
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
$fileInfo = finfo_open(FILEINFO_MIME_TYPE);
$fileType = finfo_file($fileInfo, $_FILES['avatar']['tmp_name']);
finfo_close($fileInfo);

if (!in_array($fileType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Allowed types: JPEG, PNG, GIF, WEBP']);
    exit;
}

// Create user directories if they don't exist
$userDir = getUserUploadDir($user['id']);
$avatarDir = "$userDir/avatars";

// Ensure directory exists
if (!is_dir($avatarDir)) {
    if (!mkdir($avatarDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create avatar directory']);
        exit;
    }
}


// Generate a unique filename
$extension = pathinfo($_FILES['avatar']['name'], PATHINFO_EXTENSION);
$filename = uniqid('avatar_') . '.' . $extension;
$targetPath = "$avatarDir/$filename";

// Move the uploaded file
if (!move_uploaded_file($_FILES['avatar']['tmp_name'], $targetPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save avatar']);
    exit;
}

// Update database with new avatar filename
try {
    $db = getDB();
    
    // Delete old avatar file if exists
    if (!empty($user['avatar'])) {
        $oldAvatar = "$avatarDir/{$user['avatar']}";
        if (file_exists($oldAvatar)) {
            unlink($oldAvatar);
        }
    }
    
    $stmt = $db->prepare("UPDATE Users SET avatar = ? WHERE id = ?");
    $stmt->execute([$filename, $user['id']]);
    
    echo json_encode([
        'success' => true,
        'avatar_url' => "/uploads/users/{$user['id']}/avatars/$filename"
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database update failed: ' . $e->getMessage()]);
}
