<?php
// /api/branches/upload-cover.php
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
$branchId = intval($_POST['branch_id'] ?? 0);

if ($branchId <= 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid branch ID']);
    exit;
}

// Check if user can edit this branch
$db = getDB();
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

// Check if file was uploaded
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No image uploaded or upload error']);
    exit;
}

$file = $_FILES['image'];

// Validate file type
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.']);
    exit;
}

// Validate file size (5MB max)
$maxSize = 5 * 1024 * 1024; // 5MB
if ($file['size'] > $maxSize) {
    http_response_code(400);
    echo json_encode(['error' => 'File too large. Maximum size is 5MB.']);
    exit;
}

try {
    // Check user storage quota
    $storageStmt = $db->prepare('SELECT quota FROM users WHERE id = ?');
    $storageStmt->execute([$user['id']]);
    $quota = $storageStmt->fetchColumn();
    
    // Calculate current usage
    $userDir = "/var/www/ctq/uploads/users/{$user['id']}";
    $currentUsage = 0;
    if (is_dir($userDir)) {
        $currentUsage = calculateDirectorySize($userDir);
    }
    
    if ($currentUsage + $file['size'] > $quota) {
        http_response_code(400);
        echo json_encode(['error' => 'Insufficient storage space']);
        exit;
    }
    
    // Create user images directory if it doesn't exist
    $userDir = "/var/www/ctq/uploads/users/{$user['id']}";
    $imagesDir = "$userDir/images";
    
    if (!is_dir($userDir)) {
        mkdir($userDir, 0755, true);
    }
    if (!is_dir($imagesDir)) {
        mkdir($imagesDir, 0755, true);
    }
    
    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    if (empty($extension)) {
        // Determine extension from mime type
        $extension = match($mimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            default => 'jpg'
        };
    }
    
    $filename = 'branch_' . $branchId . '_' . time() . '.' . $extension;
    $filePath = "$imagesDir/$filename";
    
    // Remove old cover image if exists
    $oldCoverStmt = $db->prepare('SELECT cover_image FROM branches WHERE id = ?');
    $oldCoverStmt->execute([$branchId]);
    $oldCover = $oldCoverStmt->fetchColumn();
    
    if ($oldCover) {
        $oldPath = "$imagesDir/$oldCover";
        if (file_exists($oldPath)) {
            unlink($oldPath);
        }
    }
    
    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $filePath)) {
        throw new Exception('Failed to save uploaded file');
    }
    
    // Update branch record
    $updateStmt = $db->prepare('UPDATE branches SET cover_image = ? WHERE id = ?');
    $updateStmt->execute([$filename, $branchId]);
    
    echo json_encode([
        'success' => true,
        'filename' => $filename,
        'message' => 'Cover image uploaded successfully'
    ]);
    
} catch (Exception $e) {
    error_log('Branch cover upload error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to upload cover image']);
}

function calculateDirectorySize($directory) {
    $size = 0;
    if (is_dir($directory)) {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        
        foreach ($files as $file) {
            if ($file->isFile()) {
                $size += $file->getSize();
            }
        }
    }
    return $size;
}