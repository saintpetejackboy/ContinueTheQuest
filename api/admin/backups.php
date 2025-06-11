<?php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');

$user = getCurrentUser();
if (!$user || !isAdmin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'GET') {
    try {
        $db = getDB();

        $stmt = $db->query(
            'SELECT bs.*, be.name AS endpoint_name FROM backup_schedules bs '
            . 'LEFT JOIN backup_endpoints be ON bs.endpoint_id = be.id'
        );
        $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $db->query(
            'SELECT bl.*, bs.backup_type FROM backup_logs bl '
            . 'LEFT JOIN backup_schedules bs ON bl.schedule_id = bs.id '
            . 'ORDER BY bl.id DESC LIMIT 20'
        );
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $backupDir = realpath(__DIR__ . '/../../backups');
        $files = [];
        if ($backupDir && is_dir($backupDir)) {
            foreach (scandir($backupDir) as $f) {
                if ($f === '.' || $f === '..') continue;
                $path = $backupDir . '/' . $f;
                if (is_file($path)) {
                    $files[] = [
                        'name' => $f,
                        'size' => filesize($path),
                        'size_formatted' => formatFileSize(filesize($path)),
                        'modified_at' => date('Y-m-d H:i:s', filemtime($path)),
                    ];
                }
            }
        }

        echo json_encode(compact('schedules', 'logs', 'files'));
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    }
    exit;
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $scheduleId = isset($data['schedule_id']) ? (int)$data['schedule_id'] : null;
    if (!$scheduleId) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing schedule_id']);
        exit;
    }
    $script = realpath(__DIR__ . '/../../scripts/backup.php');
    if (!$script) {
        http_response_code(500);
        echo json_encode(['error' => 'Backup script not found']);
        exit;
    }
    $cmd = PHP_BINARY . ' ' . escapeshellarg($script) . ' --id=' . $scheduleId;
    exec($cmd . ' 2>&1', $lines, $rc);
    $output = implode("\n", $lines);
    if ($rc !== 0) {
        http_response_code(500);
        echo json_encode(['success' => false, 'output' => $output]);
    } else {
        echo json_encode(['success' => true, 'output' => $output]);
    }
    exit;
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}