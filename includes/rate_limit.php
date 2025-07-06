<?php
/**
 * Simple file-based rate limiting for API endpoints
 */

class RateLimit {
    private $cacheDir;
    
    public function __construct($cacheDir = '/var/www/ctq/cache/rate_limits') {
        $this->cacheDir = $cacheDir;
        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0755, true);
        }
    }
    
    /**
     * Check if request is within rate limit
     * @param string $identifier - IP address or user ID
     * @param int $maxRequests - Maximum requests allowed
     * @param int $timeWindow - Time window in seconds (default: 60)
     * @return bool - True if within limit, false if exceeded
     */
    public function isAllowed($identifier, $maxRequests = 60, $timeWindow = 60) {
        $key = hash('sha256', $identifier);
        $file = $this->cacheDir . '/' . $key;
        
        $now = time();
        $requests = [];
        
        // Load existing requests from file
        if (file_exists($file)) {
            $data = file_get_contents($file);
            $requests = json_decode($data, true) ?: [];
        }
        
        // Remove old requests outside time window
        $requests = array_filter($requests, function($timestamp) use ($now, $timeWindow) {
            return ($now - $timestamp) < $timeWindow;
        });
        
        // Check if limit exceeded
        if (count($requests) >= $maxRequests) {
            return false;
        }
        
        // Add current request
        $requests[] = $now;
        
        // Save to file
        file_put_contents($file, json_encode($requests), LOCK_EX);
        
        return true;
    }
    
    /**
     * Clean up old rate limit files
     */
    public function cleanup() {
        $files = glob($this->cacheDir . '/*');
        $now = time();
        
        foreach ($files as $file) {
            if (is_file($file) && ($now - filemtime($file)) > 3600) { // 1 hour old
                unlink($file);
            }
        }
    }
}

/**
 * Apply rate limiting to current request
 * @param int $maxRequests
 * @param int $timeWindow
 * @param string $identifier
 */
function applyRateLimit($maxRequests = 60, $timeWindow = 60, $identifier = null) {
    if (!$identifier) {
        $identifier = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    }
    
    $rateLimit = new RateLimit();
    
    if (!$rateLimit->isAllowed($identifier, $maxRequests, $timeWindow)) {
        http_response_code(429);
        header('Content-Type: application/json');
        echo json_encode([
            'error' => 'Rate limit exceeded',
            'retry_after' => $timeWindow
        ]);
        exit;
    }
}
?>