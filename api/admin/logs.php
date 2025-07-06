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

if ($method === 'GET') {
    $logType = $_GET['type'] ?? 'all';
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
    $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;
    
    $logs = [];
    $logsDir = '/var/www/ctq/logs';
    
    try {
        // Get available log files
        if ($logType === 'all' || $logType === 'system') {
            $logFiles = [
                'deploy.log' => 'Deployment',
                'backups.log' => 'Backup Operations'
            ];
            
            foreach ($logFiles as $filename => $description) {
                $filepath = $logsDir . '/' . $filename;
                if (file_exists($filepath)) {
                    $content = file_get_contents($filepath);
                    $lines = array_filter(explode("\n", $content));
                    
                    // Parse log lines and add metadata
                    foreach (array_reverse($lines) as $index => $line) {
                        if ($index >= $offset && count($logs) < $limit && !empty(trim($line))) {
                            $logs[] = [
                                'id' => uniqid(),
                                'timestamp' => extractTimestamp($line),
                                'level' => extractLogLevel($line),
                                'message' => trim($line),
                                'source' => $description,
                                'file' => $filename
                            ];
                        }
                    }
                }
            }
        }
        
        // Get PHP error logs if available
        if ($logType === 'all' || $logType === 'php') {
            $phpErrorLog = ini_get('error_log');
            if ($phpErrorLog && file_exists($phpErrorLog)) {
                $content = file_get_contents($phpErrorLog);
                $lines = array_filter(explode("\n", $content));
                
                foreach (array_reverse($lines) as $index => $line) {
                    if ($index >= $offset && count($logs) < $limit && !empty(trim($line))) {
                        $logs[] = [
                            'id' => uniqid(),
                            'timestamp' => extractTimestamp($line),
                            'level' => 'ERROR',
                            'message' => trim($line),
                            'source' => 'PHP Error Log',
                            'file' => 'php_error.log'
                        ];
                    }
                }
            }
        }
        
        // Sort by timestamp (newest first)
        usort($logs, function($a, $b) {
            return strtotime($b['timestamp']) - strtotime($a['timestamp']);
        });
        
        // Apply limit after sorting
        $logs = array_slice($logs, 0, $limit);
        
        echo json_encode([
            'success' => true,
            'logs' => $logs,
            'total' => count($logs),
            'has_more' => false // Simplified for now
        ]);
        
    } catch (Exception $e) {
        error_log("Error reading logs: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Failed to read log files']);
    }
    
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}

/**
 * Extract timestamp from log line
 */
function extractTimestamp($line) {
    // Try to match common timestamp formats
    if (preg_match('/\[([^\]]+)\]/', $line, $matches)) {
        return $matches[1];
    }
    
    // Try to match ISO 8601 format
    if (preg_match('/(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2})/', $line, $matches)) {
        return $matches[1];
    }
    
    // Default to current time if no timestamp found
    return date('Y-m-d H:i:s');
}

/**
 * Extract log level from log line
 */
function extractLogLevel($line) {
    $line = strtoupper($line);
    
    if (strpos($line, 'ERROR') !== false) return 'ERROR';
    if (strpos($line, 'WARNING') !== false || strpos($line, 'WARN') !== false) return 'WARNING';
    if (strpos($line, 'INFO') !== false) return 'INFO';
    if (strpos($line, 'DEBUG') !== false) return 'DEBUG';
    if (strpos($line, 'SUCCESS') !== false) return 'SUCCESS';
    
    return 'INFO'; // Default level
}
?>