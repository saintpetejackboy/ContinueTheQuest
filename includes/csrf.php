<?php
/**
 * CSRF Protection Helper
 * Provides easy-to-use functions for CSRF protection in API endpoints
 */

/**
 * Validate CSRF token for API requests
 * Call this at the beginning of state-changing API endpoints
 */
function requireCSRFToken() {
    // Skip CSRF for GET requests (they should be read-only)
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        return true;
    }
    
    $token = null;
    
    // Check for token in POST data
    if (isset($_POST['csrf_token'])) {
        $token = $_POST['csrf_token'];
    }
    
    // Check for token in JSON body
    if (!$token) {
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        if (isset($data['csrf_token'])) {
            $token = $data['csrf_token'];
        }
    }
    
    // Check for token in headers
    if (!$token && isset($_SERVER['HTTP_X_CSRF_TOKEN'])) {
        $token = $_SERVER['HTTP_X_CSRF_TOKEN'];
    }
    
    if (!$token || !verifyCSRFToken($token)) {
        // Log CSRF violation
        require_once __DIR__ . '/security_logger.php';
        logSecurityEvent('CSRF_VIOLATION', ['endpoint' => $_SERVER['REQUEST_URI'] ?? 'unknown'], null, 'CRITICAL');
        
        http_response_code(403);
        echo json_encode(['error' => 'CSRF token validation failed']);
        exit;
    }
    
    return true;
}

/**
 * Get current CSRF token for frontend use
 */
function getCSRFTokenForAPI() {
    header('Content-Type: application/json');
    echo json_encode(['csrf_token' => generateCSRFToken()]);
    exit;
}
?>