<?php
// /api/media/update.php
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

$mediaId = isset($_POST['id']) ? (int)$_POST['id'] : 0;
$title = trim($_POST['title'] ?? '');
$description = trim($_POST['description'] ?? '');
$tags = json_decode($_POST['tags'] ?? '[]', true) ?: [];
$tags = array_unique(array_filter(array_map('trim', $tags)));
$coverImageIndex = intval($_POST['cover_image_index'] ?? 0);
$removedImages = json_decode($_POST['removed_images'] ?? '[]', true) ?: [];

if ($mediaId < 1 || $title === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields']);
    exit;
}

$db = getDB();
try {
    $db->beginTransaction();

    // Verify ownership
    $stmt = $db->prepare('SELECT created_by FROM media WHERE id = ? FOR UPDATE');
    $stmt->execute([$mediaId]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        throw new Exception('Media not found');
    }
    // Only media owner or admins may edit media
    if ((int)$row['created_by'] !== $user['id'] && empty($user['is_admin'])) {
        http_response_code(403);
        echo json_encode(['error' => 'Forbidden']);
        exit;
    }

    // Handle removed images
    if (!empty($removedImages)) {
        $checkImg = $db->prepare('SELECT id, file_name FROM media_images WHERE id = ? AND media_id = ?');
        $delImg = $db->prepare('DELETE FROM media_images WHERE id = ? AND media_id = ?');
        foreach ($removedImages as $imgId) {
            $id = (int)$imgId;
            $checkImg->execute([$id, $mediaId]);
            $img = $checkImg->fetch(PDO::FETCH_ASSOC);
            if ($img) {
                @unlink(getUserUploadDir($user['id']) . '/images/' . $img['file_name']);
                $delImg->execute([$id, $mediaId]);
            }
        }
    }

    // Check credits for new tags
    $stmt = $db->prepare('SELECT credits, quota FROM users WHERE id = ? FOR UPDATE');
    $stmt->execute([$user['id']]);
    $uRow = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$uRow) throw new Exception('User not found');
    $userCredits = $uRow['credits'];
    $userQuota = $uRow['quota'];

    $newTags = [];
    $existingTagIds = [];
    if (!empty($tags)) {
        $lowerTags = array_map('mb_strtolower', $tags);
        $ph = implode(',', array_fill(0, count($lowerTags), '?'));
        $checkTags = $db->prepare("SELECT id, name FROM tags WHERE LOWER(name) IN ($ph)");
        $checkTags->execute($lowerTags);
        $found = [];
        foreach ($checkTags->fetchAll(PDO::FETCH_ASSOC) as $t) {
            $found[mb_strtolower($t['name'])] = $t['id'];
        }
        foreach ($tags as $tagName) {
            $low = mb_strtolower($tagName);
            if (isset($found[$low])) {
                $existingTagIds[] = $found[$low];
            } else {
                $newTags[] = $tagName;
            }
        }
    }
    $creditsNeeded = count($newTags);
    if ($userCredits < $creditsNeeded) {
        throw new Exception("Insufficient credits. Need $creditsNeeded credits.");
    }

    // Handle uploads
    $uploaded = [];
    if (isset($_FILES['images']) && is_array($_FILES['images']['tmp_name'])) {
        $allowed = ['image/jpeg','image/png','image/gif','image/webp'];
        $userDir = getUserUploadDir($user['id']);
        $imgDir = $userDir . '/images';
        if (!is_dir($imgDir)) mkdir($imgDir, 0755, true);
        $currentUsage = getUserSpaceUsage($user['id']);
        $sizeSum = 0;
        for ($i = 0; $i < count($_FILES['images']['tmp_name']); $i++) {
            if ($_FILES['images']['error'][$i] === UPLOAD_ERR_OK) {
                $tmp = $_FILES['images']['tmp_name'][$i];
                $type = finfo_file(finfo_open(FILEINFO_MIME_TYPE), $tmp);
                if (!in_array($type, $allowed, true)) throw new Exception('Invalid file type');
                $sz = filesize($tmp);
                $sizeSum += $sz;
                if ($currentUsage + $sizeSum > $userQuota) throw new Exception('Exceeds storage quota');
                $uploaded[] = ['tmp' => $tmp, 'orig' => $_FILES['images']['name'][$i], 'idx' => $i];
            }
        }
    }

    // Insert new images
    $coverName = null;
    foreach ($uploaded as $file) {
        $fn = uniqid('media_') . '.webp';
        $fp = getUserUploadDir($user['id']) . '/images/' . $fn;
        if (!convertImageToWebP($file['tmp'], $fp)) {
            throw new Exception('Failed to process image');
        }
        $stmt = $db->prepare('INSERT INTO media_images (media_id, file_name, order_index) VALUES (?, ?, ?)');
        $stmt->execute([$mediaId, $fn, $file['idx']]);
        if ($file['idx'] === $coverImageIndex) {
            $coverName = $fn;
        }
    }

    // Update media
    if ($coverImageIndex >= 0 && $coverName !== null) {
        $stmt = $db->prepare('UPDATE media SET title = ?, description = ?, cover_image = ? WHERE id = ?');
        $stmt->execute([$title, $description, $coverName, $mediaId]);
    } else {
        $stmt = $db->prepare('UPDATE media SET title = ?, description = ? WHERE id = ?');
        $stmt->execute([$title, $description, $mediaId]);
    }

    // Update tags
    $stmt = $db->prepare('DELETE FROM tag_links WHERE target_type = ? AND target_id = ?');
    $stmt->execute(['media', $mediaId]);
    foreach ($newTags as $tn) {
        $stmt = $db->prepare('INSERT INTO tags (name, created_by) VALUES (?, ?)');
        $stmt->execute([trim($tn), $user['id']]);
        $existingTagIds[] = $db->lastInsertId();
    }
    foreach ($existingTagIds as $tid) {
        $stmt = $db->prepare('INSERT INTO tag_links (tag_id, target_type, target_id, tagged_by) VALUES (?, ?, ?, ?)');
        $stmt->execute([$tid, 'media', $mediaId, $user['id']]);
    }

    // Deduct credits
    if ($creditsNeeded > 0) {
        $stmt = $db->prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
        $stmt->execute([$creditsNeeded, $user['id']]);
        $stmt = $db->prepare('INSERT INTO credits_log (user_id, change_amount, reason, related_id) VALUES (?, ?, ?, ?)');
        $stmt->execute([$user['id'], -$creditsNeeded, 'Updated Media Tags', $mediaId]);
    }

    $db->commit();
    echo json_encode(['success' => true, 'id' => $mediaId, 'credits_used' => $creditsNeeded]);
} catch (Exception $e) {
    $db->rollBack();
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}