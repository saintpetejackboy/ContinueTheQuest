<?php
// /api/media/create.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

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

$title = trim($_POST['title'] ?? '');
if ($title === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Title is required']);
    exit;
}

$description = trim($_POST['description'] ?? '');
$tags = json_decode($_POST['tags'] ?? '[]', true) ?: [];
$coverImageIndex = intval($_POST['cover_image_index'] ?? 0);

$db = getDB();
$db->beginTransaction();

try {
    // Check user credits and calculate required credits
    $stmt = $db->prepare('SELECT credits, quota FROM users WHERE id = ? FOR UPDATE');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();
    if (!$row) {
        throw new Exception('User not found');
    }
    
    $userCredits = $row['credits'];
    $userQuota = $row['quota'];
    
    // Calculate credits needed
    $creditsNeeded = 1; // Base cost for creating media
    
    // Check which tags are new and need credits
    $newTags = [];
    $existingTagIds = [];
    
    if (!empty($tags)) {
        $placeholders = str_repeat('?,', count($tags) - 1) . '?';
        $stmt = $db->prepare("SELECT id, name FROM tags WHERE name IN ($placeholders)");
        $stmt->execute($tags);
        $existingTags = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);
        
        foreach ($tags as $tagName) {
            if (isset($existingTags[$tagName])) {
                $existingTagIds[] = $existingTags[$tagName];
            } else {
                $newTags[] = $tagName;
                $creditsNeeded++; // Each new tag costs 1 credit
            }
        }
    }
    
    if ($userCredits < $creditsNeeded) {
        throw new Exception("Insufficient credits. Need $creditsNeeded credits, have $userCredits");
    }
    
    // Check file uploads and quota
    $uploadedFiles = [];
    $totalSize = 0;
    
    if (isset($_FILES['images']) && is_array($_FILES['images']['tmp_name'])) {
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $userDir = getUserUploadDir($user['id']);
        $imagesDir = $userDir . '/images';
        
        if (!is_dir($imagesDir)) {
            mkdir($imagesDir, 0755, true);
        }
        
        // Get current user space usage
        $currentUsage = getUserSpaceUsage($user['id']);
        
        for ($i = 0; $i < count($_FILES['images']['tmp_name']); $i++) {
            if ($_FILES['images']['error'][$i] === UPLOAD_ERR_OK) {
                $tmpFile = $_FILES['images']['tmp_name'][$i];
                $originalName = $_FILES['images']['name'][$i];
                
                // Validate file type
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $fileType = finfo_file($finfo, $tmpFile);
                finfo_close($finfo);
                
                if (!in_array($fileType, $allowedTypes, true)) {
                    throw new Exception("Invalid file type for: $originalName");
                }
                
                // Check file size
                $fileSize = filesize($tmpFile);
                $totalSize += $fileSize;
                
                if ($currentUsage + $totalSize > $userQuota) {
                    throw new Exception('Upload would exceed storage quota');
                }
                
                $uploadedFiles[] = [
                    'tmp_name' => $tmpFile,
                    'original_name' => $originalName,
                    'size' => $fileSize,
                    'index' => $i
                ];
            }
        }
    }
    
    // Create media record
    $stmt = $db->prepare('INSERT INTO media (title, description, created_by) VALUES (?, ?, ?)');
    $stmt->execute([$title, $description, $user['id']]);
    $mediaId = $db->lastInsertId();
    
    // Process uploaded images
    $coverImageName = null;
    foreach ($uploadedFiles as $file) {
        $filename = uniqid('media_') . '.webp';
        $targetPath = $imagesDir . '/' . $filename;
        
        // Convert to WebP format
        if (convertImageToWebP($file['tmp_name'], $targetPath)) {
            // Insert into media_images table
            $stmt = $db->prepare('INSERT INTO media_images (media_id, file_name, order_index) VALUES (?, ?, ?)');
            $stmt->execute([$mediaId, $filename, $file['index']]);
            
            // Set cover image if this is the selected one
            if ($file['index'] === $coverImageIndex) {
                $coverImageName = $filename;
            }
        } else {
            throw new Exception('Failed to process image: ' . $file['original_name']);
        }
    }
    
    // Update cover image if set
    if ($coverImageName) {
        $stmt = $db->prepare('UPDATE media SET cover_image = ? WHERE id = ?');
        $stmt->execute([$coverImageName, $mediaId]);
    }
    
    // Create new tags
    foreach ($newTags as $tagName) {
        $stmt = $db->prepare('INSERT INTO tags (name, created_by) VALUES (?, ?)');
        $stmt->execute([trim($tagName), $user['id']]);
        $existingTagIds[] = $db->lastInsertId();
    }
    
    // Link tags to media
    foreach ($existingTagIds as $tagId) {
        $stmt = $db->prepare('INSERT INTO tag_links (tag_id, target_type, target_id, tagged_by) VALUES (?, ?, ?, ?)');
        $stmt->execute([$tagId, 'media', $mediaId, $user['id']]);
    }
    
    // Deduct credits
    $stmt = $db->prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
    $stmt->execute([$creditsNeeded, $user['id']]);
    
    // Log credit transactions
    $stmt = $db->prepare('INSERT INTO credits_log (user_id, change_amount, reason, related_id) VALUES (?, ?, ?, ?)');
    $stmt->execute([$user['id'], -1, 'Created Media', $mediaId]);
    
    foreach ($newTags as $tagName) {
        $stmt->execute([$user['id'], -1, 'Created Tag: ' . $tagName, $mediaId]);
    }
    
    $db->commit();
    
    echo json_encode([
        'success' => true, 
        'id' => $mediaId, 
        'credits_used' => $creditsNeeded,
        'new_tags_created' => count($newTags)
    ]);
    
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}

function convertImageToWebP($source, $destination) {
    $imageInfo = getimagesize($source);
    if (!$imageInfo) return false;
    
    $mime = $imageInfo['mime'];
    $image = null;
    
    switch ($mime) {
        case 'image/jpeg':
            $image = imagecreatefromjpeg($source);
            break;
        case 'image/png':
            $image = imagecreatefrompng($source);
            break;
        case 'image/gif':
            $image = imagecreatefromgif($source);
            break;
        case 'image/webp':
            $image = imagecreatefromwebp($source);
            break;
        default:
            return false;
    }
    
    if (!$image) return false;
    
    // Convert to WebP with quality 85
    $result = imagewebp($image, $destination, 85);
    imagedestroy($image);
    
    return $result;
}

function getUserSpaceUsage($userId) {
    $userDir = getUserUploadDir($userId);
    if (!is_dir($userDir)) return 0;
    
    $size = 0;
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($userDir));
    
    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $size += $file->getSize();
        }
    }
    
    return $size;
}