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

    // --- System Uptime ---
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
        // For Windows, you might use systeminfo or wmic, but uptime -p is Linux specific
        // For simplicity, we'll just leave it empty for Windows if /proc/uptime isn't available
        $uptime = 'N/A';
    }

    // --- User Statistics ---
    $totalUsers = (int)$db->query('SELECT COUNT(*) FROM Users')->fetchColumn();
    $adminUsers = (int)$db->query('SELECT COUNT(*) FROM Users WHERE is_admin = 1')->fetchColumn();
    $bannedUsers = (int)$db->query('SELECT COUNT(*) FROM Users WHERE is_banned = 1')->fetchColumn();
    $totalCredits = (int)$db->query('SELECT SUM(credits) FROM Users')->fetchColumn();

    $userGrowth = $db->query('SELECT DATE_FORMAT(created_at, "%Y-%m") AS month, COUNT(*) AS count FROM Users GROUP BY month ORDER BY month')->fetchAll(PDO::FETCH_ASSOC);

    // --- Media Statistics ---
    $totalMedia = (int)$db->query('SELECT COUNT(*) FROM Media')->fetchColumn();
    $mediaGrowth = $db->query('SELECT DATE_FORMAT(created_at, "%Y-%m") AS month, COUNT(*) AS count FROM Media GROUP BY month ORDER BY month')->fetchAll(PDO::FETCH_ASSOC);
    $avgMediaVoteScore = (float)$db->query('SELECT AVG(vote_score) FROM Media')->fetchColumn();

    // --- Branch Statistics ---
    $totalBranches = (int)$db->query('SELECT COUNT(*) FROM Branches')->fetchColumn();
    $branchGrowth = $db->query('SELECT DATE_FORMAT(created_at, "%Y-%m") AS month, COUNT(*) AS count FROM Branches GROUP BY month ORDER BY month')->fetchAll(PDO::FETCH_ASSOC);
    $branchesByType = $db->query('SELECT branch_type, COUNT(*) AS count FROM Branches GROUP BY branch_type')->fetchAll(PDO::FETCH_ASSOC);
    $avgBranchVoteScore = (float)$db->query('SELECT AVG(vote_score) FROM Branches')->fetchColumn();

    // --- Segment Statistics ---
    $totalSegments = (int)$db->query('SELECT COUNT(*) FROM Segments')->fetchColumn();
    $segmentGrowth = $db->query('SELECT DATE_FORMAT(created_at, "%Y-%m") AS month, COUNT(*) AS count FROM Segments GROUP BY month ORDER BY month')->fetchAll(PDO::FETCH_ASSOC);
    $avgSegmentVoteScore = (float)$db->query('SELECT AVG(vote_score) FROM Segments')->fetchColumn();

    // --- Comment Statistics ---
    $totalComments = (int)$db->query('SELECT COUNT(*) FROM Comments')->fetchColumn();
    $commentGrowth = $db->query('SELECT DATE_FORMAT(created_at, "%Y-%m") AS month, COUNT(*) AS count FROM Comments GROUP BY month ORDER BY month')->fetchAll(PDO::FETCH_ASSOC);
    $commentsByTargetType = $db->query('SELECT target_type, COUNT(*) AS count FROM Comments GROUP BY target_type')->fetchAll(PDO::FETCH_ASSOC);
    $avgCommentVoteScore = (float)$db->query('SELECT AVG(vote_score) FROM Comments')->fetchColumn();
    $hiddenComments = (int)$db->query('SELECT COUNT(*) FROM Comments WHERE hidden = 1')->fetchColumn();

    // --- Vote Statistics ---
    $totalVotes = (int)$db->query('SELECT COUNT(*) FROM Votes')->fetchColumn();
    $upvotes = (int)$db->query('SELECT COUNT(*) FROM Votes WHERE vote_value = 1')->fetchColumn();
    $downvotes = (int)$db->query('SELECT COUNT(*) FROM Votes WHERE vote_value = -1')->fetchColumn();

    // --- Tag Statistics ---
    $totalTags = (int)$db->query('SELECT COUNT(*) FROM Tags')->fetchColumn();
    $genreTags = (int)$db->query('SELECT COUNT(*) FROM Tags WHERE is_genre = 1')->fetchColumn();
    $topTags = $db->query('SELECT t.name, COUNT(tl.tag_id) AS count FROM Tags t JOIN tag_links tl ON t.id = tl.tag_id GROUP BY t.name ORDER BY count DESC LIMIT 10')->fetchAll(PDO::FETCH_ASSOC);

    // --- AI Model Statistics ---
    $aiModels = $db->query('SELECT name, description, is_active, cost_per_use FROM ai_models')->fetchAll(PDO::FETCH_ASSOC);

    // --- Submission Statistics ---
    $totalSubmissions = (int)$db->query('SELECT COUNT(*) FROM Submissions')->fetchColumn();
    $submissionsByType = $db->query('SELECT type, COUNT(*) AS count FROM Submissions GROUP BY type')->fetchAll(PDO::FETCH_ASSOC);

    // --- Storage Statistics (requires calculating from file system) ---
    // This is a simplified calculation. A more robust solution would involve
    // iterating through user upload directories and summing file sizes.
    // For now, we'll use the existing profile.php logic for breakdown.
    
    // Total allocated quota (sum of all user quotas)
    $totalQuotaBytes = (int)$db->query('SELECT SUM(quota) FROM Users')->fetchColumn();

    // Calculate actual used storage by iterating through upload directories
    function calculateDirectorySize($path) {
        $size = 0;
        if (!is_dir($path)) return $size;
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($path, FilesystemIterator::SKIP_DOTS)) as $file) {
            if ($file->isFile()) {
                $size += $file->getSize();
            }
        }
        return $size;
    }

    $uploadsBasePath = __DIR__ . '/../../uploads/users';
    $totalUsedBytes = 0;
    $storageBreakdown = [
        'avatars' => 0,
        'images' => 0,
        'texts' => 0,
        'other' => 0 // For any files not categorized
    ];

    if (is_dir($uploadsBasePath)) {
        foreach (new DirectoryIterator($uploadsBasePath) as $userDir) {
            if ($userDir->isDot() || !$userDir->isDir()) continue;
            $userPath = $userDir->getPathname();

            $avatarPath = $userPath . '/avatars';
            if (is_dir($avatarPath)) {
                $size = calculateDirectorySize($avatarPath);
                $storageBreakdown['avatars'] += $size;
                $totalUsedBytes += $size;
            }

            $imagesPath = $userPath . '/images';
            if (is_dir($imagesPath)) {
                $size = calculateDirectorySize($imagesPath);
                $storageBreakdown['images'] += $size;
                $totalUsedBytes += $size;
            }

            $textsPath = $userPath . '/texts';
            if (is_dir($textsPath)) {
                $size = calculateDirectorySize($textsPath);
                $storageBreakdown['texts'] += $size;
                $totalUsedBytes += $size;
            }
            
            // Calculate 'other' by summing up all files in user's root upload dir
            // and subtracting already counted categories. This is a bit tricky
            // and might double count if not careful. A simpler approach for 'other'
            // is to just sum up everything in the user's root and then subtract
            // the known categories.
            $userRootSize = calculateDirectorySize($userPath);
            $otherSize = $userRootSize - ($size); // $size here is the last calculated size (textsPath)
            // A more accurate way for 'other' would be to sum all files in userPath
            // and then subtract the sum of known subdirectories.
            // For now, we'll just sum up all files in the user's root and let the frontend calculate 'other'
            // by subtracting known categories from totalUsedBytes.
        }
    }

    // Total files in uploads (re-using existing logic)
    $uploadsDir = __DIR__ . '/../../uploads';
    $totalFiles = 0;
    if (is_dir($uploadsDir)) {
        foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($uploadsDir, FilesystemIterator::SKIP_DOTS)) as $file) {
            if ($file->isFile()) {
                $totalFiles++;
            }
        }
    }

    // Log files (re-using existing logic)
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

    // Markdown files at project root (re-using existing logic)
    $mdFiles = [];
    $root = __DIR__ . '/../../';
    foreach (scandir($root) as $f) {
        if (preg_match('/\.md$/i', $f)) {
            $mdFiles[] = $f;
        }
    }

    echo json_encode([
        'system' => [
            'uptime' => $uptime,
            'total_files_in_uploads' => $totalFiles,
            'logs' => $logs,
            'markdown_files' => $mdFiles,
        ],
        'users' => [
            'total' => $totalUsers,
            'admins' => $adminUsers,
            'banned' => $bannedUsers,
            'total_credits' => $totalCredits,
            'growth' => $userGrowth,
        ],
        'media' => [
            'total' => $totalMedia,
            'growth' => $mediaGrowth,
            'avg_vote_score' => round($avgMediaVoteScore, 2),
        ],
        'branches' => [
            'total' => $totalBranches,
            'growth' => $branchGrowth,
            'by_type' => $branchesByType,
            'avg_vote_score' => round($avgBranchVoteScore, 2),
        ],
        'segments' => [
            'total' => $totalSegments,
            'growth' => $segmentGrowth,
            'avg_vote_score' => round($avgSegmentVoteScore, 2),
        ],
        'comments' => [
            'total' => $totalComments,
            'growth' => $commentGrowth,
            'by_target_type' => $commentsByTargetType,
            'avg_vote_score' => round($avgCommentVoteScore, 2),
            'hidden' => $hiddenComments,
        ],
        'votes' => [
            'total' => $totalVotes,
            'upvotes' => $upvotes,
            'downvotes' => $downvotes,
        ],
        'tags' => [
            'total' => $totalTags,
            'genres' => $genreTags,
            'top_10' => $topTags,
        ],
        'ai_models' => $aiModels,
        'submissions' => [
            'total' => $totalSubmissions,
            'by_type' => $submissionsByType,
        ],
        'storage' => [
            'total_allocated_bytes' => $totalQuotaBytes,
            'total_used_bytes' => $totalUsedBytes,
            'breakdown' => $storageBreakdown,
        ],
    ]);
    exit;
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
    exit;
}