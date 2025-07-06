<?php
// api/segments/upload.php
// Upload story segment file with quota checking
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

$user = getCurrentUser();
if (!$user) {
    jsonResponse(['success' => false, 'error' => 'Not authenticated'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

$branchId = isset($_POST['branch_id']) ? (int)$_POST['branch_id'] : 0;
$title = isset($_POST['title']) ? trim($_POST['title']) : '';
$description = isset($_POST['description']) ? trim($_POST['description']) : '';
$orderIndex = isset($_POST['order_index']) ? (int)$_POST['order_index'] : 1;
$tags = isset($_POST['tags']) ? json_decode($_POST['tags'], true) : [];
$isAiGenerated = isset($_POST['is_ai_generated']) ? (bool)$_POST['is_ai_generated'] : false;
$aiModel = isset($_POST['ai_model']) ? trim($_POST['ai_model']) : '';

if (!$branchId || !$title) {
    jsonResponse(['success' => false, 'error' => 'Branch ID and title are required'], 400);
}

// Check if user can add segments to this branch
$db = getDB();
$branchStmt = $db->prepare('SELECT created_by FROM branches WHERE id = ?');
$branchStmt->execute([$branchId]);
$branch = $branchStmt->fetch(PDO::FETCH_ASSOC);

if (!$branch) {
    jsonResponse(['success' => false, 'error' => 'Branch not found'], 404);
}

$canEdit = ($user['id'] === (int)$branch['created_by'] || $user['is_admin']);
if (!$canEdit) {
    jsonResponse(['success' => false, 'error' => 'Permission denied'], 403);
}

// Check if file was uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    jsonResponse(['success' => false, 'error' => 'No file uploaded or upload error'], 400);
}

$file = $_FILES['file'];
$allowedTypes = ['text/plain', 'text/markdown'];
$maxSize = 500 * 1024; // 500KB

// Use server-side MIME type detection instead of trusting client
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$detectedType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

// Also check file extension for additional security
$allowedExtensions = ['txt', 'md'];
$fileExtension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

if (!in_array($detectedType, $allowedTypes) || !in_array($fileExtension, $allowedExtensions)) {
    jsonResponse(['success' => false, 'error' => 'Invalid file type. Only .txt and .md files are allowed'], 400);
}

if ($file['size'] > $maxSize) {
    jsonResponse(['success' => false, 'error' => 'File too large. Maximum size is 500KB'], 400);
}

// Check user storage quota
$userDir = "/var/www/ctq/uploads/users/" . $user['id'];
$usedBytes = 0;

if (is_dir($userDir)) {
    $usedBytes = calculateDirectorySize($userDir);
}

$quota = (int)$user['quota'];
$availableBytes = $quota - $usedBytes;

if ($file['size'] > $availableBytes) {
    jsonResponse(['success' => false, 'error' => 'Insufficient storage space. File requires ' . formatBytes($file['size']) . ' but only ' . formatBytes($availableBytes) . ' available'], 400);
}

// Create user directory if it doesn't exist
if (!is_dir($userDir)) {
    if (!mkdir($userDir, 0755, true)) {
        jsonResponse(['success' => false, 'error' => 'Failed to create user directory'], 500);
    }
}

// Create segments subdirectory
$segmentsDir = $userDir . '/segments';
if (!is_dir($segmentsDir)) {
    if (!mkdir($segmentsDir, 0755, true)) {
        jsonResponse(['success' => false, 'error' => 'Failed to create segments directory'], 500);
    }
}

// Generate unique filename
$extension = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = uniqid('segment_') . '.' . $extension;
$filepath = $segmentsDir . '/' . $filename;

// Move uploaded file
if (!move_uploaded_file($file['tmp_name'], $filepath)) {
    jsonResponse(['success' => false, 'error' => 'Failed to save file'], 500);
}

// Handle optional image upload
$imagePath = null;
if (isset($_FILES['image']) && $_FILES['image']['error'] === UPLOAD_ERR_OK) {
    $imageFile = $_FILES['image'];
    
    // Validate image type
    $allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $imageMimeType = finfo_file($finfo, $imageFile['tmp_name']);
    finfo_close($finfo);
    
    if (!in_array($imageMimeType, $allowedImageTypes)) {
        unlink($filepath); // Clean up text file
        jsonResponse(['success' => false, 'error' => 'Invalid image type. Only JPEG, PNG, WebP, and GIF images are allowed'], 400);
    }
    
    // Validate image size (5MB max)
    $maxImageSize = 5 * 1024 * 1024; // 5MB
    if ($imageFile['size'] > $maxImageSize) {
        unlink($filepath); // Clean up text file
        jsonResponse(['success' => false, 'error' => 'Image too large. Maximum size is 5MB'], 400);
    }
    
    // Check if image fits in quota (in addition to text file)
    if (($file['size'] + $imageFile['size']) > $availableBytes) {
        unlink($filepath); // Clean up text file
        jsonResponse(['success' => false, 'error' => 'Insufficient storage space for both files'], 400);
    }
    
    // Create images directory if needed
    $imagesDir = $userDir . '/images';
    if (!is_dir($imagesDir)) {
        if (!mkdir($imagesDir, 0755, true)) {
            unlink($filepath); // Clean up text file
            jsonResponse(['success' => false, 'error' => 'Failed to create images directory'], 500);
        }
    }
    
    // Generate unique image filename
    $imageExtension = pathinfo($imageFile['name'], PATHINFO_EXTENSION);
    if (empty($imageExtension)) {
        // Determine extension from mime type
        $imageExtension = match($imageMimeType) {
            'image/jpeg' => 'jpg',
            'image/png' => 'png',
            'image/webp' => 'webp',
            'image/gif' => 'gif',
            default => 'jpg'
        };
    }
    
    $imageFilename = uniqid('segment_') . '.' . $imageExtension;
    $imageFilepath = $imagesDir . '/' . $imageFilename;
    
    // Move uploaded image
    if (!move_uploaded_file($imageFile['tmp_name'], $imageFilepath)) {
        unlink($filepath); // Clean up text file
        jsonResponse(['success' => false, 'error' => 'Failed to save image'], 500);
    }
    
    $imagePath = 'images/' . $imageFilename;
}

try {
    // Start transaction
    $db->beginTransaction();
    
    // Create segment record
    $segmentStmt = $db->prepare('INSERT INTO segments (branch_id, title, description, file_path, image_path, created_by, order_index, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())');
    $segmentStmt->execute([$branchId, $title, $description, 'segments/' . $filename, $imagePath, $user['id'], $orderIndex]);
    $segmentId = $db->lastInsertId();
    
    // Handle tags if provided
    if (!empty($tags)) {
        $tagCost = 0;
        $existingTags = [];
        $newTags = [];
        
        // Check which tags already exist
        if (!empty($tags)) {
            $placeholders = str_repeat('?,', count($tags) - 1) . '?';
            $tagCheckStmt = $db->prepare("SELECT id, name FROM tags WHERE name IN ($placeholders)");
            $tagCheckStmt->execute($tags);
            $existingTagRows = $tagCheckStmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($existingTagRows as $row) {
                $existingTags[$row['name']] = $row['id'];
            }
            
            foreach ($tags as $tagName) {
                if (!isset($existingTags[$tagName])) {
                    $newTags[] = $tagName;
                }
            }
        }
        
        // Calculate cost for new tags
        $tagCost = count($newTags);
        
        // Check if user has enough credits for new tags
        if ($tagCost > 0 && $user['credits'] < $tagCost) {
            $db->rollBack();
            unlink($filepath); // Clean up uploaded file
            jsonResponse(['success' => false, 'error' => "Insufficient credits. Need $tagCost credits for new tags"], 400);
        }
        
        // Create new tags
        foreach ($newTags as $tagName) {
            $tagStmt = $db->prepare('INSERT INTO tags (name, created_by, created_at) VALUES (?, ?, NOW())');
            $tagStmt->execute([$tagName, $user['id']]);
            $existingTags[$tagName] = $db->lastInsertId();
        }
        
        // Link tags to segment
        foreach ($tags as $tagName) {
            $tagId = $existingTags[$tagName];
            $linkStmt = $db->prepare('INSERT INTO tag_links (tag_id, target_type, target_id, tagged_by, tagged_at) VALUES (?, ?, ?, ?, NOW())');
            $linkStmt->execute([$tagId, 'segment', $segmentId, $user['id']]);
        }
        
        // Deduct credits for new tags
        if ($tagCost > 0) {
            $creditStmt = $db->prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
            $creditStmt->execute([$tagCost, $user['id']]);
            
            // Log credit transaction
            $logStmt = $db->prepare('INSERT INTO credits_log (user_id, change_amount, reason, related_id, created_at) VALUES (?, ?, ?, ?, NOW())');
            $logStmt->execute([$user['id'], -$tagCost, 'New tags for segment', $segmentId]);
        }
    }
    
    // Add mandatory AI tags if AI-generated
    if ($isAiGenerated) {
        $aiTags = ['AI-Assisted'];
        if ($aiModel) {
            $aiTags[] = $aiModel;
        }
        
        foreach ($aiTags as $tagName) {
            // Check if tag exists
            $tagStmt = $db->prepare('SELECT id FROM tags WHERE name = ?');
            $tagStmt->execute([$tagName]);
            $tagId = $tagStmt->fetchColumn();
            
            if (!$tagId) {
                // Create AI tag (free for system)
                $tagStmt = $db->prepare('INSERT INTO tags (name, created_by, created_at) VALUES (?, ?, NOW())');
                $tagStmt->execute([$tagName, $user['id']]);
                $tagId = $db->lastInsertId();
            }
            
            // Link to segment
            $linkStmt = $db->prepare('INSERT INTO tag_links (tag_id, target_type, target_id, tagged_by, tagged_at) VALUES (?, ?, ?, ?, NOW())');
            $linkStmt->execute([$tagId, 'segment', $segmentId, $user['id']]);
        }
    }
    
    $db->commit();
    
    jsonResponse([
        'success' => true,
        'segment_id' => $segmentId,
        'filename' => $filename,
        'credits_used' => $tagCost
    ]);
    
} catch (Exception $e) {
    $db->rollBack();
    unlink($filepath); // Clean up uploaded text file
    if ($imagePath && file_exists($userDir . '/' . $imagePath)) {
        unlink($userDir . '/' . $imagePath); // Clean up uploaded image file
    }
    jsonResponse(['success' => false, 'error' => 'Database error: ' . $e->getMessage()], 500);
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

function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}
?>