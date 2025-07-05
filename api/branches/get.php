<?php
// api/branches/get.php
// Retrieve branch details, tags, and metadata for a branch page.
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

$user = getCurrentUser();

$branchId = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if (!$branchId) {
    jsonResponse(['success' => false, 'error' => 'Branch ID is required'], 400);
}

$db = getDB();
// Fetch branch and owner info
$stmt = $db->prepare(
    'SELECT b.id, b.media_id, b.title, b.summary, b.branch_type, b.source_type,
            b.cover_image, b.created_by, b.vote_score, b.created_at,
            u.username AS author, u.avatar AS author_avatar
     FROM branches b
     LEFT JOIN users u ON u.id = b.created_by
     WHERE b.id = ?'
);
$stmt->execute([$branchId]);
$branch = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$branch) {
    jsonResponse(['success' => false, 'error' => 'Branch not found'], 404);
}

// Fetch tags linked to this branch
$tagStmt = $db->prepare(
    'SELECT t.id, t.name FROM tag_links tl
     JOIN tags t ON t.id = tl.tag_id
     WHERE tl.target_type = "branch" AND tl.target_id = ?'
);
$tagStmt->execute([$branchId]);
$tags = $tagStmt->fetchAll(PDO::FETCH_ASSOC);

// Determine permissions
$canEdit = ($user && ($user['id'] === (int)$branch['created_by'] || isAdmin()));

jsonResponse([
    'success'  => true,
    'branch'   => $branch,
    'tags'     => $tags,
    'can_edit' => $canEdit,
]);