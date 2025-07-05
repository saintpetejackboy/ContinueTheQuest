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
    'SELECT id, title, summary, branch_type, source_type, vote_score, created_at
     FROM branches
     WHERE media_id = ?
     ORDER BY created_at ASC'
);
$stmt->execute([$mediaId]);
$branches = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonResponse(['success' => true, 'branches' => $branches]);