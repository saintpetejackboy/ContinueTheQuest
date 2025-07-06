<?php
/**
 * Health check endpoint for monitoring
 */

require_once __DIR__ . '/../bootstrap.php';

header('Content-Type: application/json');

$health = [
    'status' => 'ok',
    'timestamp' => date('c'),
    'checks' => []
];

// Database check
try {
    $db = getDB();
    $stmt = $db->query('SELECT 1');
    $health['checks']['database'] = [
        'status' => 'ok',
        'response_time' => microtime(true) - $_SERVER['REQUEST_TIME_FLOAT']
    ];
} catch (Exception $e) {
    $health['status'] = 'error';
    $health['checks']['database'] = [
        'status' => 'error',
        'error' => 'Database connection failed'
    ];
}

// File system check
$uploadsDir = '/var/www/ctq/uploads';
if (is_writable($uploadsDir)) {
    $health['checks']['filesystem'] = ['status' => 'ok'];
} else {
    $health['status'] = 'warning';
    $health['checks']['filesystem'] = [
        'status' => 'warning',
        'error' => 'Uploads directory not writable'
    ];
}

// Cache directory check
$cacheDir = '/var/www/ctq/cache';
if (is_writable($cacheDir)) {
    $health['checks']['cache'] = ['status' => 'ok'];
} else {
    $health['checks']['cache'] = [
        'status' => 'warning',
        'error' => 'Cache directory not writable'
    ];
}

// Disk space check
$freeBytes = disk_free_space('/var/www/ctq');
$totalBytes = disk_total_space('/var/www/ctq');
$usedPercent = (($totalBytes - $freeBytes) / $totalBytes) * 100;

if ($usedPercent > 90) {
    $health['status'] = 'warning';
    $health['checks']['disk_space'] = [
        'status' => 'warning',
        'used_percent' => round($usedPercent, 2),
        'free_gb' => round($freeBytes / 1024 / 1024 / 1024, 2)
    ];
} else {
    $health['checks']['disk_space'] = [
        'status' => 'ok',
        'used_percent' => round($usedPercent, 2),
        'free_gb' => round($freeBytes / 1024 / 1024 / 1024, 2)
    ];
}

// Set appropriate HTTP status
if ($health['status'] === 'error') {
    http_response_code(503);
} elseif ($health['status'] === 'warning') {
    http_response_code(200); // Still operational
}

echo json_encode($health, JSON_PRETTY_PRINT);
?>