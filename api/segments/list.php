<?php
// api/segments/list.php
// Get segments for a branch with tags and metadata
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

$user = getCurrentUser();
$branchId = isset($_GET['branch_id']) ? (int)$_GET['branch_id'] : 0;

if (!$branchId) {
    jsonResponse(['success' => false, 'error' => 'Branch ID is required'], 400);
}

$db = getDB();

// Get segments for this branch with comment counts
$stmt = $db->prepare(
    'SELECT s.id, s.title, s.description, s.file_path, s.image_path, s.created_by, s.vote_score, 
            s.order_index, s.created_at, u.username AS author, u.avatar AS author_avatar,
            COUNT(c.id) AS comment_count
     FROM segments s
     LEFT JOIN users u ON u.id = s.created_by
     LEFT JOIN comments c ON c.target_type = "segment" AND c.target_id = s.id AND c.hidden = 0
     WHERE s.branch_id = ?
     GROUP BY s.id
     ORDER BY s.order_index ASC, s.created_at ASC'
);
$stmt->execute([$branchId]);
$segments = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get tags for each segment
foreach ($segments as &$segment) {
    $tagStmt = $db->prepare(
        'SELECT t.id, t.name, tl.is_mandatory 
         FROM tag_links tl
         JOIN tags t ON t.id = tl.tag_id
         WHERE tl.target_type = "segment" AND tl.target_id = ?
         ORDER BY tl.is_mandatory DESC, t.name ASC'
    );
    $tagStmt->execute([$segment['id']]);
    $segment['tags'] = $tagStmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Check if user can edit this segment
    $segment['can_edit'] = ($user && ($user['id'] === (int)$segment['created_by'] || $user['is_admin']));
}

jsonResponse([
    'success' => true,
    'segments' => $segments
]);