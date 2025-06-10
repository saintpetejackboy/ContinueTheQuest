<?php
// /var/www/ctq/api/auth/login_passkey.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/webauthn.php';

// Ensure a session is active
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
$method = $_SERVER['REQUEST_METHOD'];
$db = getDB();

// Generate options for a "username-less" login
if ($method === 'GET') {
    try {
        $options = generateLoginOptions();
        echo json_encode($options);
        exit;
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not generate login options: ' . $e->getMessage()]);
        exit;
    }
}

// Verify the login assertion from the browser
if ($method === 'POST') {
    // Get the raw JSON data from the request body
    $data = json_decode(file_get_contents('php://input'), true);
    
    // Basic validation of the incoming data
    if (!$data || !isset($data['rawId']) || !isset($data['response']['userHandle'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid or incomplete input data from client']);
        exit;
    }
    
    try {
        // Get the user's unique ID from the response
        $userId = base64url_decode($data['response']['userHandle']);
        if (empty($userId)) {
             http_response_code(400);
             echo json_encode(['error' => 'User handle not found in response. Cannot identify user.']);
             exit;
        }
        
        // Fetch all registered passkeys for the user
        $stmt = $db->prepare("SELECT credential_id, public_key, sign_count, transports, attestation_type, aaguid, user_id FROM User_Passkeys WHERE user_id = ?");
        $stmt->execute([$userId]);
        $credentialSources = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($credentialSources)) {
            http_response_code(404);
            echo json_encode(['error' => 'No credentials found for the identified user.']);
            exit;
        }
        
        // Verify the login response
        $validatedSource = verifyLoginResponse($data, $credentialSources);
        
        // Update the signature count to prevent replay attacks
        $credentialIdRaw = base64url_decode($data['rawId']);
        $newSignCount = $validatedSource->getCounter();
        $stmt = $db->prepare("UPDATE User_Passkeys SET sign_count = ?, last_used_at = NOW() WHERE credential_id = ?");
        $stmt->execute([$newSignCount, $credentialIdRaw]);
        
        // Log the user in by creating their session
        loginUser($userId);
        echo json_encode(['success' => true]);
    } catch (Throwable $e) {
        http_response_code(400);
        echo json_encode(['error' => 'Login verification failed: ' . $e->getMessage()]);
    }
    exit;
}

// Fallback for other HTTP methods
http_response_code(405);
echo json_encode(['error' => 'Method Not Allowed']);