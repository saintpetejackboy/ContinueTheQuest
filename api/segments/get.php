<?php
// api/segments/get.php
// Get detailed information about a specific segment including content, branch, and media context
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

$segmentId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if (!$segmentId) {
    jsonResponse(['success' => false, 'error' => 'Segment ID is required'], 400);
}

$db = getDB();

// Get segment info with branch and media context
$stmt = $db->prepare(
    'SELECT s.id, s.title, s.description, s.file_path, s.image_path, s.created_by, 
            s.vote_score, s.order_index, s.created_at,
            u.username AS author, u.avatar_filename AS author_avatar,
            b.id AS branch_id, b.title AS branch_title, b.summary AS branch_summary,
            b.branch_type, b.created_by AS branch_owner,
            m.id AS media_id, m.title AS media_title, m.description AS media_description
     FROM segments s
     LEFT JOIN users u ON u.id = s.created_by
     LEFT JOIN branches b ON b.id = s.branch_id
     LEFT JOIN media m ON m.id = b.media_id
     WHERE s.id = ?'
);
$stmt->execute([$segmentId]);
$segment = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$segment) {
    jsonResponse(['success' => false, 'error' => 'Segment not found'], 404);
}

// Get segment tags
$stmt = $db->prepare(
    'SELECT t.id, t.name, tl.is_mandatory 
     FROM tags t 
     JOIN tag_links tl ON t.id = tl.tag_id 
     WHERE tl.target_type = "segment" AND tl.target_id = ?'
);
$stmt->execute([$segmentId]);
$tags = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Get comment count
$stmt = $db->prepare(
    'SELECT COUNT(*) as count FROM comments WHERE target_type = "segment" AND target_id = ?'
);
$stmt->execute([$segmentId]);
$commentCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

// Read content from file
$filePath = "/var/www/ctq/uploads/users/" . $segment['created_by'] . "/" . $segment['file_path'];
$content = '';
$fileType = '';

if (file_exists($filePath)) {
    $content = file_get_contents($filePath);
    $fileType = pathinfo($filePath, PATHINFO_EXTENSION);
}

// Check if user can edit this segment
$canEdit = false;
$currentUser = getCurrentUser();
if ($currentUser) {
    $canEdit = $currentUser['is_admin'] || $currentUser['id'] == $segment['created_by'];
}

// Get other segments in this branch for navigation
$stmt = $db->prepare(
    'SELECT s.id, s.title, s.order_index
     FROM segments s
     WHERE s.branch_id = ?
     ORDER BY s.order_index ASC, s.created_at ASC'
);
$stmt->execute([$segment['branch_id']]);
$allSegments = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Find current segment position in the list
$currentIndex = -1;
foreach ($allSegments as $index => $seg) {
    if ($seg['id'] == $segmentId) {
        $currentIndex = $index;
        break;
    }
}

$prevSegment = ($currentIndex > 0) ? $allSegments[$currentIndex - 1] : null;
$nextSegment = ($currentIndex < count($allSegments) - 1) ? $allSegments[$currentIndex + 1] : null;

jsonResponse([
    'success' => true,
    'segment' => $segment,
    'tags' => $tags,
    'content' => $content,
    'file_type' => $fileType,
    'comment_count' => $commentCount,
    'can_edit' => $canEdit,
    'navigation' => [
        'current_position' => $currentIndex + 1,
        'total_segments' => count($allSegments),
        'prev_segment' => $prevSegment,
        'next_segment' => $nextSegment
    ]
]);