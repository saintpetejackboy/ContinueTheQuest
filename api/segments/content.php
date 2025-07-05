<?php
// api/segments/content.php
// Get content of a specific segment for reading
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

$segmentId = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if (!$segmentId) {
    jsonResponse(['success' => false, 'error' => 'Segment ID is required'], 400);
}

$db = getDB();

// Get segment info
$stmt = $db->prepare(
    'SELECT s.id, s.title, s.file_path, s.created_by, u.username AS author
     FROM segments s
     LEFT JOIN users u ON u.id = s.created_by
     WHERE s.id = ?'
);
$stmt->execute([$segmentId]);
$segment = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$segment) {
    jsonResponse(['success' => false, 'error' => 'Segment not found'], 404);
}

// Read content from file
$filePath = "/var/www/ctq/uploads/users/" . $segment['created_by'] . "/" . $segment['file_path'];

if (!file_exists($filePath)) {
    jsonResponse(['success' => false, 'error' => 'Segment file not found'], 404);
}

$content = file_get_contents($filePath);

if ($content === false) {
    jsonResponse(['success' => false, 'error' => 'Failed to read segment content'], 500);
}

jsonResponse([
    'success' => true,
    'segment' => $segment,
    'content' => $content,
    'file_type' => pathinfo($filePath, PATHINFO_EXTENSION)
]);