<?php
// /api/admin/file.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');

$user = getCurrentUser();
if (!$user || !isAdmin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$type = isset($_GET['type']) ? $_GET['type'] : '';
$name = isset($_GET['name']) ? basename($_GET['name']) : '';
if (!in_array($type, ['log', 'markdown'], true)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid type']);
    exit;
}
if ($type === 'markdown' && !preg_match('/\.md$/i', $name)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid markdown file']);
    exit;
}

$baseDir = $type === 'log'
    ? realpath(__DIR__ . '/../../logs')
    : realpath(__DIR__ . '/../../');

$filePath = realpath($baseDir . '/' . $name);
if (!$filePath || strpos($filePath, $baseDir) !== 0 || !is_file($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found']);
    exit;
}

if ($type === 'log') {
    $lines = isset($_GET['lines']) ? intval($_GET['lines']) : 500;
    $lines = max(0, min($lines, 5000));
    $content = tailFile($filePath, $lines);
} else {
    $content = file_get_contents($filePath);
}

echo json_encode(['content' => $content]);
exit;

/**
 * Read the last N lines of a file.
 */
function tailFile(string $file, int $lines = 500): string {
    $f = new SplFileObject($file, 'r');
    $f->seek(PHP_INT_MAX);
    $total = $f->key();
    $start = max(0, $total - $lines);
    $f->seek($start);
    $buffer = '';
    while (!$f->eof()) {
        $buffer .= $f->current();
        $f->next();
    }
    return $buffer;
}