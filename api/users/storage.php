<?php
// api/users/storage.php
// Get user's storage usage and quota information
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

$user = getCurrentUser();
if (!$user) {
    jsonResponse(['success' => false, 'error' => 'Not authenticated'], 401);
}

$userDir = "/var/www/ctq/uploads/users/" . $user['id'];
$usedBytes = 0;

// Calculate used storage by recursively scanning user directory
if (is_dir($userDir)) {
    $usedBytes = calculateDirectorySize($userDir);
}

function calculateDirectorySize($directory) {
    $size = 0;
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    
    foreach ($files as $file) {
        if ($file->isFile()) {
            $size += $file->getSize();
        }
    }
    
    return $size;
}

$quota = (int)$user['quota']; // bytes
$usedPercentage = $quota > 0 ? ($usedBytes / $quota) * 100 : 0;

jsonResponse([
    'success' => true,
    'used_bytes' => $usedBytes,
    'quota_bytes' => $quota,
    'used_percentage' => round($usedPercentage, 2),
    'available_bytes' => max(0, $quota - $usedBytes),
    'formatted' => [
        'used' => formatBytes($usedBytes),
        'quota' => formatBytes($quota),
        'available' => formatBytes(max(0, $quota - $usedBytes))
    ]
]);

function formatBytes($bytes, $precision = 2) {
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    
    for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
        $bytes /= 1024;
    }
    
    return round($bytes, $precision) . ' ' . $units[$i];
}
?>