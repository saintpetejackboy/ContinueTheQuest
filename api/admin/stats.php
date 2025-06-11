<?php
// /api/admin/stats.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');

$user = getCurrentUser();
if (!$user || !isAdmin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

try {
    $db = getDB();

    // Uptime
    $uptime = '';
    if (is_readable('/proc/uptime')) {
        $data = explode(' ', file_get_contents('/proc/uptime'));
        $seconds = (float)$data[0];
        $days = floor($seconds / 86400);
        $hours = floor(($seconds % 86400) / 3600);
        $minutes = floor(($seconds % 3600) / 60);
        $parts = [];
        if ($days) $parts[] = "{$days}d";
        if ($hours) $parts[] = "{$hours}h";
        if ($minutes) $parts[] = "{$minutes}m";
        $uptime = implode(' ', $parts);
    } elseif (stripos(PHP_OS, 'WIN') !== 0) {
        $out = shell_exec('uptime -p');
        $uptime = trim($out);
    }

    // Total users
    $totalUsers = (int)$db->query('SELECT COUNT(*) FROM Users')->fetchColumn();
    // Total media entries
    $totalMedia = (int)$db->query('SELECT COUNT(*) FROM Media')->fetchColumn();

    // Total files in uploads
    $uploadsDir = __DIR__ . '/../../uploads';
    $totalFiles = 0;
    if (is_dir($uploadsDir)) {
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($uploadsDir, FilesystemIterator::SKIP_DOTS)) as $file) {
            if ($file->isFile()) {
                $totalFiles++;
            }
        }
    }

    // Log files
    $logDir = __DIR__ . '/../../logs';
    $logs = [];
    if (is_dir($logDir)) {
        foreach (scandir($logDir) as $f) {
            if ($f === '.' || $f === '..') continue;
            if (is_file("$logDir/$f")) {
                $logs[] = $f;
            }
        }
    }

    // Markdown files at project root
    $mdFiles = [];
    $root = __DIR__ . '/../../';
    foreach (scandir($root) as $f) {
        if (preg_match('/\.md$/i', $f)) {
            $mdFiles[] = $f;
        }
    }

    echo json_encode([
        'uptime'      => $uptime,
        'total_users' => $totalUsers,
        'total_media' => $totalMedia,
        'total_files' => $totalFiles,
        'logs'        => $logs,
        'markdown'    => $mdFiles,
    ]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    exit;
}