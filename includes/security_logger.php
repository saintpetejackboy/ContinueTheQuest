<?php
/**
 * Security event logging system
 */

class SecurityLogger {
    private $db;
    private $logFile;
    
    public function __construct() {
        $this->db = getDB();
        $this->logFile = '/var/www/ctq/logs/security.log';
        
        // Ensure log directory exists
        $logDir = dirname($this->logFile);
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
    }
    
    /**
     * Log security event
     */
    public function log($event, $details = [], $userId = null, $severity = 'INFO') {
        $timestamp = date('Y-m-d H:i:s');
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
        
        // Log to database
        try {
            $stmt = $this->db->prepare('
                INSERT INTO security_logs 
                (event_type, details, user_id, ip_address, user_agent, severity, created_at) 
                VALUES (?, ?, ?, ?, ?, ?, NOW())
            ');
            $stmt->execute([
                $event,
                json_encode($details),
                $userId,
                $ip,
                $userAgent,
                $severity
            ]);
        } catch (Exception $e) {
            // Fall back to file logging if database fails
            error_log("Security log DB error: " . $e->getMessage());
        }
        
        // Also log to file
        $logEntry = sprintf(
            "[%s] %s - %s - IP: %s - User: %s - Details: %s\n",
            $timestamp,
            $severity,
            $event,
            $ip,
            $userId ?? 'guest',
            json_encode($details)
        );
        
        file_put_contents($this->logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
    
    // Convenience methods for common events
    public function logLoginAttempt($username, $success = false) {
        $this->log(
            $success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
            ['username' => $username],
            null,
            $success ? 'INFO' : 'WARNING'
        );
    }
    
    public function logAdminAction($action, $userId, $details = []) {
        $this->log(
            'ADMIN_ACTION',
            array_merge(['action' => $action], $details),
            $userId,
            'INFO'
        );
    }
    
    public function logRateLimitExceeded($endpoint) {
        $this->log(
            'RATE_LIMIT_EXCEEDED',
            ['endpoint' => $endpoint],
            null,
            'WARNING'
        );
    }
    
    public function logCSRFViolation($endpoint) {
        $this->log(
            'CSRF_VIOLATION',
            ['endpoint' => $endpoint],
            null,
            'CRITICAL'
        );
    }
    
    public function logFileUpload($filename, $userId, $size) {
        $this->log(
            'FILE_UPLOAD',
            ['filename' => $filename, 'size' => $size],
            $userId,
            'INFO'
        );
    }
}

// Global function for easy access
function logSecurityEvent($event, $details = [], $userId = null, $severity = 'INFO') {
    static $logger = null;
    if (!$logger) {
        $logger = new SecurityLogger();
    }
    $logger->log($event, $details, $userId, $severity);
}
?>