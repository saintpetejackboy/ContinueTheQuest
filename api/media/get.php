<?php
// /api/media/get.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

header('Content-Type: application/json');
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$mediaId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($mediaId < 1) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid media id']);
    exit;
}

$db = getDB();
try {
    // Fetch main media data and author info
    $stmt = $db->prepare(
        'SELECT m.id, m.title, m.description, m.cover_image, m.created_by, m.vote_score, m.created_at,
                u.username, u.avatar
         FROM media m
         JOIN users u ON u.id = m.created_by
         WHERE m.id = ?'
    );
    $stmt->execute([$mediaId]);
    $media = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$media) {
        http_response_code(404);
        echo json_encode(['error' => 'Media not found']);
        exit;
    }

    // Fetch images (include hidden for editors/admins)
    $currentUser = getCurrentUser();
    $canEditOwner = $currentUser && $currentUser['id'] === (int)$media['created_by'];
    $isAdmin = $currentUser && !empty($currentUser['is_admin']);
    if ($canEditOwner || $isAdmin) {
        $imgStmt = $db->prepare('SELECT id, file_name, order_index, vote_score, hidden FROM media_images WHERE media_id = ? ORDER BY order_index ASC');
        $imgStmt->execute([$mediaId]);
    } else {
        $imgStmt = $db->prepare('SELECT id, file_name, order_index, vote_score, hidden FROM media_images WHERE media_id = ? AND hidden = 0 ORDER BY order_index ASC');
        $imgStmt->execute([$mediaId]);
    }
    $images = $imgStmt->fetchAll(PDO::FETCH_ASSOC);

    // Fetch tags
    $stmt = $db->prepare(
        'SELECT t.id, t.name
         FROM tags t
         JOIN tag_links tl ON tl.tag_id = t.id
         WHERE tl.target_type = \'media\' AND tl.target_id = ?'
    );
    $stmt->execute([$mediaId]);
    $tags = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Determine edit permissions
    $canEdit = $canEditOwner || $isAdmin;

    echo json_encode([
        'media' => [
            'id' => (int)$media['id'],
            'title' => $media['title'],
            'description' => $media['description'],
            'cover_image' => $media['cover_image'],
            'created_by' => (int)$media['created_by'],
            'author' => $media['username'],
            'author_avatar' => $media['avatar']
                ? "/uploads/users/{$media['created_by']}/avatars/{$media['avatar']}"
                : null,
            'is_admin' => $isAdmin,
            'vote_score' => (int)$media['vote_score'],
            'created_at' => $media['created_at'],
            'images' => array_map(function($img) {
                return [
                    'id' => (int)$img['id'],
                    'file_name' => $img['file_name'],
                    'order_index' => (int)$img['order_index'],
                    'vote_score' => (int)$img['vote_score'],
                    'hidden' => (bool)$img['hidden']
                ];
            }, $images),
            'tags' => array_map(function($t) {
                return ['id' => (int)$t['id'], 'name' => $t['name']];
            }, $tags),
            'can_edit_owner' => $canEditOwner,
            'can_edit' => $canEdit
        ]
    ]);
} catch (Exception $e) {
    error_log('Media get error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
}