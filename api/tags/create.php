<?php
// api/tags/create.php
// Create a new tag and deduct a credit if necessary.
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

$user = getCurrentUser();
if (!$user) {
    jsonResponse(['success' => false, 'error' => 'Authentication required'], 401);
}

$data = json_decode(file_get_contents('php://input'), true) ?? [];
$name = trim($data['name'] ?? '');
if ($name === '') {
    jsonResponse(['success' => false, 'error' => 'Tag name is required'], 400);
}

$db = getDB();
// Check if tag already exists
$stmt = $db->prepare('SELECT id FROM tags WHERE name = ?');
$stmt->execute([$name]);
if ($stmt->fetchColumn()) {
    jsonResponse(['success' => false, 'error' => 'Tag already exists'], 409);
}

// Verify credit balance
if ($user['credits'] < 1) {
    jsonResponse(['success' => false, 'error' => 'Insufficient credits'], 402);
}

// Create new tag
$stmt = $db->prepare('INSERT INTO tags (name, created_by) VALUES (?, ?)');
$stmt->execute([$name, $user['id']]);
$tagId = (int)$db->lastInsertId();

// Deduct credit from user
$stmt = $db->prepare('UPDATE users SET credits = credits - 1 WHERE id = ?');
$stmt->execute([$user['id']]);

// Log credit change
$stmt = $db->prepare(
    'INSERT INTO credits_log (user_id, change_amount, reason, related_id) VALUES (?, ?, ?, ?)'
);
$stmt->execute([$user['id'], -1, 'Create new tag', $tagId]);

// Fetch updated credit balance
$stmt = $db->prepare('SELECT credits FROM users WHERE id = ?');
$stmt->execute([$user['id']]);
$creditsLeft = (int)$stmt->fetchColumn();

jsonResponse([
    'success'      => true,
    'tag'          => ['id' => $tagId, 'name' => $name],
    'credits_left' => $creditsLeft,
]);