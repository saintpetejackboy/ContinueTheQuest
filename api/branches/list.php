<?php
// api/branches/list.php
// List all branches for a given media.
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

$mediaId = isset($_GET['media_id']) ? (int)$_GET['media_id'] : 0;
if (!$mediaId) {
    jsonResponse(['success' => false, 'error' => 'Media ID is required'], 400);
}

$db = getDB();
$stmt = $db->prepare(
    'SELECT 
        b.id, 
        b.title, 
        b.summary, 
        b.branch_type, 
        b.source_type, 
        b.vote_score, 
        b.created_at, 
        b.created_by,
        u.username AS author,
        u.avatar AS author_avatar,
        COALESCE(
            b.cover_image,
            (SELECT s.image_path FROM segments s WHERE s.branch_id = b.id AND s.image_path IS NOT NULL ORDER BY s.created_at DESC LIMIT 1)
        ) AS display_image,
        (SELECT COUNT(*) FROM segments s WHERE s.branch_id = b.id) AS segment_count,
        (SELECT COUNT(*) FROM comments c JOIN segments s ON c.target_id = s.id WHERE c.target_type = \'segment\' AND s.branch_id = b.id) AS comment_count
     FROM branches b
     JOIN users u ON b.created_by = u.id
     WHERE b.media_id = ?
     ORDER BY b.created_at ASC'
);
$stmt->execute([$mediaId]);
$branches = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonResponse(['success' => true, 'branches' => $branches]);