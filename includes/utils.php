<?php
// Common utility functions for ContinueThe.Quest
// includes/utils.php
/**
 * Sanitize output for HTML
 */
function h($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

/**
 * Get database connection
 */

function getDB() {
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    // 1) Pull from env (with fallbacks)
    $host = getenv('DB_HOST')     ?: '127.0.0.1';
    $port = getenv('DB_PORT')     ?: 3306;
    $db   = getenv('DB_NAME')     ?: 'ctq';
    $user = getenv('DB_USER')     ?: 'dbUser';
    $pass = getenv('DB_PASSWORD');
    if ($pass === false) {
        // ensure non-null, so PDO will at least attempt password auth
        $pass = '';
    }



    // 3) Build DSN
    $dsn = "mysql:host={$host};port={$port};dbname={$db};charset=utf8mb4";


    // 4) Attempt connection
    try {
        $pdo = new PDO($dsn, $user, $pass, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        error_log("getDB() PDOException: " . $e->getMessage());
        if (php_sapi_name() !== 'cli') {
            header('Content-Type: application/json', true, 500);
            echo json_encode(['error' => 'Database connection failed']);
        }
        exit;
    }

    return $pdo;
}

function base64url_decode(string $data): string {
    $remainder = strlen($data) % 4;
    if ($remainder) {
        $padlen = 4 - $remainder;
        $data .= str_repeat('=', $padlen);
    }
    return base64_decode(strtr($data, '-_', '+/'));
}


/**
 * Get directory size in bytes
 */
function getDirSize($dir) {
    $size = 0;
    if (!is_dir($dir)) return $size;
    
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS)) as $file) {
        $size += $file->getSize();
    }
    return $size;
}


/**
 * Generate CSRF token
 */
function generateCSRFToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

/**
 * Verify CSRF token
 */
function verifyCSRFToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

/**
 * Redirect helper
 */
function redirect($url, $code = 302) {
    header("Location: $url", true, $code);
    exit;
}

/**
 * JSON response helper
 */
function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

/**
 * Get user upload directory
 */
function getUserUploadDir($userId) {
    // Create base directory path
    $baseDir = __DIR__ . '/../uploads/users/' . intval($userId);
    
    // Check if parent directories exist
    $parentDir = dirname($baseDir);
    if (!is_dir($parentDir)) {
        // Create parent directories recursively
        if (!mkdir($parentDir, 0755, true)) {
            error_log("Failed to create parent directory: $parentDir");
            return false;
        }
    }
    
    // Create user directory if it doesn't exist
    if (!is_dir($baseDir)) {
        if (!mkdir($baseDir, 0755, true)) {
            error_log("Failed to create user directory: $baseDir");
            return false;
        }
        
        // Create subdirectories
        $subdirs = ['avatars', 'images', 'texts'];
        foreach ($subdirs as $dir) {
          $path = __DIR__ . '/../uploads/users/' . $userId;
if (!is_dir($path)) {
    if (!mkdir($path, 0755, true)) {
        error_log("Failed to create user directory: $path");
    }
}

        }
    }
    
    return $baseDir;
}

/**
 * Format file size
 */
function formatFileSize($bytes) {
    $units = ['B', 'KB', 'MB', 'GB'];
    $bytes = max($bytes, 0);
    $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
    $pow = min($pow, count($units) - 1);
    $bytes /= pow(1024, $pow);
    return round($bytes, 2) . ' ' . $units[$pow];
}

/**
 * Time ago helper
 */
function timeAgo($datetime) {
    $time = strtotime($datetime);
    $now = time();
    $diff = $now - $time;
    
    if ($diff < 60) return 'just now';
    if ($diff < 3600) return floor($diff / 60) . ' min ago';
    if ($diff < 86400) return floor($diff / 3600) . ' hours ago';
    if ($diff < 604800) return floor($diff / 86400) . ' days ago';
    
    return date('M j, Y', $time);
}

/**
 * Slug generator
 */
function generateSlug($str) {
    $str = strtolower(trim($str));
    $str = preg_replace('/[^a-z0-9-]/', '-', $str);
    $str = preg_replace('/-+/', '-', $str);
    return trim($str, '-');
}



/**
 * Check if user is admin
 */
function isAdmin() {
    $user = getCurrentUser();
    return $user && $user['is_admin'] == 1;
}
