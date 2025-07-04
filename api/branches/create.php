<?php
// api/branches/create.php
// Create a new branch under a media entry.
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

$user = getCurrentUser();
if (!$user) {
    jsonResponse(['success' => false, 'error' => 'Authentication required'], 401);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$mediaId    = isset($data['media_id']) ? (int)$data['media_id'] : 0;
$branchType = $data['branch_type'] ?? '';
$sourceType = $data['source_type'] ?? '';
$title      = trim($data['title'] ?? '');
$summary    = trim($data['summary'] ?? '');

if (!$mediaId || !$title || !$branchType || !$sourceType) {
    jsonResponse(['success' => false, 'error' => 'Missing required fields'], 400);
}

$db = getDB();
// Verify media exists
$stmt = $db->prepare('SELECT id FROM media WHERE id = ?');
$stmt->execute([$mediaId]);
if (!$stmt->fetchColumn()) {
    jsonResponse(['success' => false, 'error' => 'Media not found'], 404);
}

// Insert branch
$stmt = $db->prepare(
    'INSERT INTO branches (media_id, title, summary, branch_type, source_type, created_by) 
     VALUES (?, ?, ?, ?, ?, ?)' 
);
$stmt->execute([$mediaId, $title, $summary, $branchType, $sourceType, $user['id']]);
$branchId = (int)$db->lastInsertId();

jsonResponse([
    'success'   => true,
    'branch_id' => $branchId,
]);