<?php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

// Ensure only admins can access
$user = getCurrentUser();
if (!$user || !$user['is_admin']) {
    http_response_code(403);
    echo json_encode(['error' => 'Admin access required']);
    exit;
}

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];

// Parse the request URI to determine the action
$requestUri = $_SERVER['REQUEST_URI'];
$path = parse_url($requestUri, PHP_URL_PATH);
$pathParts = explode('/', trim($path, '/'));

// Expected format: /api/admin/github/{action}
$action = $pathParts[3] ?? '';

try {
    switch ($action) {
        case 'commits':
            handleCommits();
            break;
        case 'refresh':
            handleRefresh();
            break;
        default:
            http_response_code(404);
            echo json_encode(['error' => 'Action not found']);
    }
} catch (Exception $e) {
    error_log("GitHub API error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error']);
}

function handleCommits() {
    $logFile = __DIR__ . '/../../logs/git_commits.json';
    
    if (!file_exists($logFile)) {
        // Try to generate log if it doesn't exist
        $scriptPath = __DIR__ . '/../../scripts/update_git_log.sh';
        if (file_exists($scriptPath)) {
            exec($scriptPath);
        }
    }
    
    if (file_exists($logFile)) {
        $commits = json_decode(file_get_contents($logFile), true);
        
        if ($commits === null) {
            echo json_encode(['success' => false, 'error' => 'Invalid log file format']);
            return;
        }
        
        // Clean up and validate commit data
        $cleanCommits = [];
        foreach ($commits as $commit) {
            if (isset($commit['commit']) && isset($commit['message'])) {
                $cleanCommits[] = [
                    'commit' => $commit['commit'],
                    'abbreviated_commit' => $commit['abbreviated_commit'] ?? substr($commit['commit'], 0, 7),
                    'author' => $commit['author'] ?? 'Unknown',
                    'author_email' => $commit['author_email'] ?? '',
                    'date' => $commit['date'] ?? '',
                    'message' => $commit['message'] ?? '',
                    'body' => $commit['body'] ?? ''
                ];
            }
        }
        
        echo json_encode([
            'success' => true,
            'commits' => $cleanCommits,
            'total' => count($cleanCommits),
            'last_updated' => file_exists($logFile) ? filemtime($logFile) : null
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Git log file not found. Please refresh to generate.',
            'commits' => []
        ]);
    }
}

function handleRefresh() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        return;
    }
    
    $scriptPath = __DIR__ . '/../../scripts/update_git_log.sh';
    
    if (!file_exists($scriptPath)) {
        echo json_encode(['success' => false, 'error' => 'Update script not found']);
        return;
    }
    
    // Execute the git log update script
    $output = [];
    $returnCode = 0;
    exec($scriptPath . ' 2>&1', $output, $returnCode);
    
    if ($returnCode === 0) {
        echo json_encode([
            'success' => true,
            'message' => 'Git log updated successfully',
            'output' => implode('\n', $output)
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Failed to update git log',
            'output' => implode('\n', $output)
        ]);
    }
}
?>