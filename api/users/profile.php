<?php
// /api/users/profile.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

header('Content-Type: application/json');

$user = getCurrentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// Ensure user directories exist and get disk usage
$userDir = getUserUploadDir($user['id']);
if ($userDir === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create user directories']);
    exit;
}

// Set default values for disk usage in case directories don't exist
$diskUsage = [
    'total' => 0,
    'avatars' => is_dir("$userDir/avatars") ? getDirSize("$userDir/avatars") : 0,
    'images' => is_dir("$userDir/images") ? getDirSize("$userDir/images") : 0,
    'texts' => is_dir("$userDir/texts") ? getDirSize("$userDir/texts") : 0
];
$diskUsage['total'] = $diskUsage['avatars'] + $diskUsage['images'] + $diskUsage['texts'];

// Get quota info
$db = getDB();
$stmt = $db->prepare("SELECT quota FROM Users WHERE id = ?");
$stmt->execute([$user['id']]);
$quotaInfo = $stmt->fetch(PDO::FETCH_ASSOC);
$quota = $quotaInfo ? (int)$quotaInfo['quota'] : 1024 * 1024 * 100; // Default 100MB

// Get credits
$stmt = $db->prepare("SELECT credits FROM Users WHERE id = ?");
$stmt->execute([$user['id']]);
$credits = $stmt->fetch(PDO::FETCH_ASSOC)['credits'] ?? 0;

// Get passkeys count
$stmt = $db->prepare("SELECT COUNT(*) as count FROM User_Passkeys WHERE user_id = ?");
$stmt->execute([$user['id']]);
$passkeysCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;

// Check if passphrase is set
$stmt = $db->prepare("SELECT (passphrase_hash IS NOT NULL) as has_passphrase FROM Users WHERE id = ?");
$stmt->execute([$user['id']]);
$hasPassphrase = $stmt->fetch(PDO::FETCH_ASSOC)['has_passphrase'] ?? false;

// Count user stats (assuming you have these tables)
$userStats = [
    'media_created' => 0,
    'branches_created' => 0,
    'segments_written' => 0,
    'comments_posted' => 0
];

try {
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM Media WHERE created_by = ?");
    $stmt->execute([$user['id']]);
    $userStats['media_created'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'] ?? 0;
} catch (Exception $e) {
    // Table might not exist yet
    error_log("Error counting media: " . $e->getMessage());
}

// Fix for created_at - ensure it has a default value
$created_at = isset($user['created_at']) && !empty($user['created_at']) 
    ? $user['created_at'] 
    : date('Y-m-d H:i:s'); // Use current date as fallback

// Prepare the response
$response = [
    'user' => [
        'id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'bio' => $user['bio'] ?? '',
        'avatar_url' => !empty($user['avatar']) ? "/uploads/users/{$user['id']}/avatars/{$user['avatar']}" : null,
        'created_at' => $created_at,
    ],
    'credits' => $credits,
    'has_passphrase' => $hasPassphrase,
    'passkeys_count' => $passkeysCount,
    'disk_usage' => [
        'used' => $diskUsage['total'],
        'used_formatted' => formatFileSize($diskUsage['total']),
        'quota' => $quota,
        'quota_formatted' => formatFileSize($quota),
        'percent' => $quota > 0 ? round(($diskUsage['total'] / $quota) * 100, 1) : 0,
        'breakdown' => [
            'avatars' => formatFileSize($diskUsage['avatars']),
            'images' => formatFileSize($diskUsage['images']),
            'texts' => formatFileSize($diskUsage['texts'])
        ]
    ],
    'stats' => $userStats
];

echo json_encode($response);