<?php
/**
 * System Integration and Initialization
 * Brings together all security, monitoring, and performance systems
 */

// Load all system components
require_once __DIR__ . '/security_logger.php';
require_once __DIR__ . '/rate_limit.php';
require_once __DIR__ . '/csrf.php';
require_once __DIR__ . '/validator.php';
require_once __DIR__ . '/cache.php';
require_once __DIR__ . '/connection_pool.php';

/**
 * Initialize all systems
 */
function initializeSystems() {
    // Ensure cache directories exist
    $dirs = [
        '/var/www/ctq/cache/api',
        '/var/www/ctq/cache/rate_limits',
        '/var/www/ctq/logs',
        '/var/www/ctq/backups'
    ];
    
    foreach ($dirs as $dir) {
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
    }
    
    // Initialize rate limiting cleanup (1% chance per request)
    if (random_int(1, 100) === 1) {
        $rateLimit = new RateLimit();
        $rateLimit->cleanup();
    }
    
    // Initialize cache cleanup (1% chance per request)
    if (random_int(1, 100) === 1) {
        cleanupExpiredCache();
    }
}

/**
 * Clean up expired cache files
 */
function cleanupExpiredCache() {
    $cacheDir = '/var/www/ctq/cache/api';
    if (!is_dir($cacheDir)) return;
    
    $files = glob($cacheDir . '/*');
    $now = time();
    
    foreach ($files as $file) {
        if (!is_file($file)) continue;
        
        $data = json_decode(file_get_contents($file), true);
        if ($data && isset($data['expires']) && $data['expires'] < $now) {
            unlink($file);
        }
    }
}

/**
 * Enhanced API response helper with all integrations
 */
function apiResponse($data, $httpCode = 200, $cache = false, $ttl = 300) {
    http_response_code($httpCode);
    header('Content-Type: application/json');
    
    // Add security headers
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');
    
    if ($cache) {
        header('Cache-Control: public, max-age=' . $ttl);
        header('Expires: ' . gmdate('D, d M Y H:i:s', time() + $ttl) . ' GMT');
    } else {
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
    }
    
    echo json_encode($data);
    exit;
}

/**
 * Secure API endpoint wrapper
 */
function secureEndpoint($callback, $options = []) {
    $defaults = [
        'rate_limit' => 60,
        'rate_window' => 60,
        'require_auth' => true,
        'require_csrf' => false,
        'validation_rules' => [],
        'cache_key' => null,
        'cache_ttl' => 300
    ];
    
    $config = array_merge($defaults, $options);
    
    // Initialize systems
    initializeSystems();
    
    // Apply rate limiting
    if ($config['rate_limit'] > 0) {
        applyRateLimit($config['rate_limit'], $config['rate_window']);
    }
    
    // Check authentication
    if ($config['require_auth']) {
        $user = getCurrentUser();
        if (!$user) {
            logSecurityEvent('UNAUTHORIZED_ACCESS', ['endpoint' => $_SERVER['REQUEST_URI'] ?? 'unknown']);
            apiResponse(['error' => 'Authentication required'], 401);
        }
    }
    
    // CSRF protection
    if ($config['require_csrf'] && $_SERVER['REQUEST_METHOD'] !== 'GET') {
        requireCSRFToken();
    }
    
    // Input validation
    if (!empty($config['validation_rules'])) {
        $data = $_SERVER['REQUEST_METHOD'] === 'GET' ? $_GET : $_POST;
        validateRequest($data, $config['validation_rules']);
    }
    
    // Check cache for GET requests
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $config['cache_key']) {
        $cache = new Cache();
        $cached = $cache->get($config['cache_key']);
        if ($cached !== null) {
            header('X-Cache: HIT');
            echo $cached;
            exit;
        }
    }
    
    // Execute callback
    $result = $callback();
    
    // Cache result if specified
    if ($_SERVER['REQUEST_METHOD'] === 'GET' && $config['cache_key'] && $result) {
        $cache = new Cache();
        $cache->set($config['cache_key'], json_encode($result), $config['cache_ttl']);
        header('X-Cache: MISS');
    }
    
    return $result;
}

// Auto-initialize when included
initializeSystems();
?>