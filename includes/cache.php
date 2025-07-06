<?php
/**
 * Simple file-based caching system
 */

class Cache {
    private $cacheDir;
    
    public function __construct($cacheDir = '/var/www/ctq/cache/api') {
        $this->cacheDir = $cacheDir;
        if (!is_dir($this->cacheDir)) {
            mkdir($this->cacheDir, 0755, true);
        }
    }
    
    /**
     * Get cached response
     */
    public function get($key) {
        $file = $this->getCacheFile($key);
        
        if (!file_exists($file)) {
            return null;
        }
        
        $data = json_decode(file_get_contents($file), true);
        
        // Check if expired
        if ($data && $data['expires'] > time()) {
            return $data['content'];
        }
        
        // Remove expired cache
        unlink($file);
        return null;
    }
    
    /**
     * Store response in cache
     */
    public function set($key, $content, $ttl = 300) {
        $file = $this->getCacheFile($key);
        
        $data = [
            'content' => $content,
            'expires' => time() + $ttl,
            'created' => time()
        ];
        
        file_put_contents($file, json_encode($data), LOCK_EX);
    }
    
    /**
     * Clear cache entry
     */
    public function delete($key) {
        $file = $this->getCacheFile($key);
        if (file_exists($file)) {
            unlink($file);
        }
    }
    
    /**
     * Clear all cache
     */
    public function clear() {
        $files = glob($this->cacheDir . '/*');
        foreach ($files as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
    }
    
    private function getCacheFile($key) {
        return $this->cacheDir . '/' . hash('sha256', $key);
    }
}

/**
 * Cache API response helper
 */
function cacheResponse($cacheKey, $callback, $ttl = 300) {
    $cache = new Cache();
    
    // Try to get from cache
    $cached = $cache->get($cacheKey);
    if ($cached !== null) {
        header('Content-Type: application/json');
        header('X-Cache: HIT');
        echo $cached;
        exit;
    }
    
    // Generate response
    ob_start();
    $result = $callback();
    $content = ob_get_clean();
    
    // Cache the response
    $cache->set($cacheKey, $content, $ttl);
    
    header('Content-Type: application/json');
    header('X-Cache: MISS');
    echo $content;
    exit;
}
?>