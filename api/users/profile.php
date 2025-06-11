<?php
// /api/users/profile.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

header('Content-Type: application/json');

// --- Auth & method guard ---
$user = getCurrentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

try {
    $db = getDB();

    // --- 1) Load core user data ---
    $stmt = $db->prepare('
        SELECT 
            id,
            username,
            email,
            bio,
            avatar,
            created_at,
            last_active_at,
            sort_preference,
            is_admin,
            credits,
            quota,
            passphrase_hash IS NOT NULL AS has_passphrase
        FROM Users
        WHERE id = ?
    ');
    $stmt->execute([$user['id']]);
    $ud = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$ud) {
        throw new Exception('User not found');
    }

    // --- 2) Disk usage breakdown ---
    $userDir = getUserUploadDir($ud['id']);
    if ($userDir === false) {
        throw new Exception('Failed to create or access user directory');
    }
    $du = [
        'avatars' => is_dir("$userDir/avatars") ? getDirSize("$userDir/avatars") : 0,
        'images'  => is_dir("$userDir/images")  ? getDirSize("$userDir/images")  : 0,
        'texts'   => is_dir("$userDir/texts")   ? getDirSize("$userDir/texts")   : 0,
    ];
    $totalUsed = array_sum($du);
    $quota = (int)$ud['quota'];
    $percent = $quota > 0 ? round(($totalUsed / $quota) * 100, 1) : 0;

    // --- 3) Passkeys & stats ---
    // passkeys count
    $stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM User_Passkeys WHERE user_id = ?');
    $stmt->execute([$ud['id']]);
    $passkeysCount = (int)$stmt->fetch(PDO::FETCH_ASSOC)['cnt'];

    // various stats
    $stats = [
        'media_created'    => 0,
        'media_count'      => 0,
        'branches_created' => 0,
        'segments_written' => 0,
        'comments_posted'  => 0,
    ];
    // media_created = count in Media.created_by
    $stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM Media WHERE created_by = ?');
    $stmt->execute([$ud['id']]);
    $stats['media_created'] = (int)$stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
    $stats['media_count']   = $stats['media_created'];
    // branches
    try {
        $stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM Branches WHERE user_id = ?');
        $stmt->execute([$ud['id']]);
        $stats['branches_created'] = (int)$stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
    } catch (Exception $e) { /* table may not exist */ }
    // segments
    try {
        $stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM Segments WHERE user_id = ?');
        $stmt->execute([$ud['id']]);
        $stats['segments_written'] = (int)$stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
    } catch (Exception $e) { }
    // comments
    try {
        $stmt = $db->prepare('SELECT COUNT(*) AS cnt FROM Comments WHERE user_id = ?');
        $stmt->execute([$ud['id']]);
        $stats['comments_posted'] = (int)$stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
    } catch (Exception $e) { }

    // --- 4) Recent credit transactions ---
    $stmt = $db->prepare('
        SELECT change_amount, reason, created_at
        FROM credits_log
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 10
    ');
    $stmt->execute([$ud['id']]);
    $recentTx = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // --- Build response ---
    $response = [
        // core user info
        'id'               => (int)$ud['id'],
        'username'         => $ud['username'],
        'email'            => $ud['email'],
        'bio'              => $ud['bio'] ?? '',
        'avatar'           => $ud['avatar'],
        'avatar_url'       => $ud['avatar']
                                ? "/uploads/users/{$ud['id']}/avatars/{$ud['avatar']}"
                                : null,
        'created_at'       => $ud['created_at'],
        'last_active_at'   => $ud['last_active_at'],
        'sort_preference'  => $ud['sort_preference'],
        'is_admin'         => (bool)$ud['is_admin'],

        // accounting & quotas
        'credits'          => (int)$ud['credits'],
        'quota'            => $quota,
        'space_used'       => $totalUsed,
        'space_available'  => max(0, $quota - $totalUsed),
        'disk_usage'       => [
            'used'            => $totalUsed,
            'used_formatted'  => formatFileSize($totalUsed),
            'quota'           => $quota,
            'quota_formatted' => formatFileSize($quota),
            'percent'         => $percent,
            'breakdown'       => [
                'avatars' => formatFileSize($du['avatars']),
                'images'  => formatFileSize($du['images']),
                'texts'   => formatFileSize($du['texts']),
            ],
        ],

        // security
        'has_passphrase'   => (bool)$ud['has_passphrase'],
        'passkeys_count'   => $passkeysCount,

        // usage stats
        'stats'            => $stats,

        // recent transactions
        'recent_transactions' => $recentTx,
    ];

    echo json_encode($response);
    exit;

} catch (Exception $e) {
    error_log("Profile error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Server error']);
    exit;
}
