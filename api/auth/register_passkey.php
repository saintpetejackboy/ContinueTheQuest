<?php
// /api/auth/register_passkey.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/webauthn.php';

header('Content-Type: application/json');
$user = getCurrentUser();

// Ensure the user is logged in
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized. You must be logged in to register a passkey.']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $options = generateRegistrationOptions((int)$user['id'], $user['username']);
    echo json_encode($options);
} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    try {
        $db = getDB();
        $credentialSource = verifyRegistrationResponse($data, (int)$user['id']);
        
        $stmt = $db->prepare("
            INSERT INTO User_Passkeys (user_id, credential_id, public_key, sign_count, transports, attestation_type, aaguid, created_at)
            VALUES (:user_id, :credential_id, :public_key, :sign_count, :transports, :attestation_type, :aaguid, NOW())
        ");
        $stmt->execute([
            ':user_id' => $user['id'],
            ':credential_id' => base64url_encode($credentialSource->getPublicKeyCredentialId()),
            ':public_key' => base64url_encode($credentialSource->getCredentialPublicKey()),
            ':sign_count' => $credentialSource->getCounter(),
            ':transports' => implode(',', $credentialSource->getTransports() ?? []),
            ':attestation_type' => $credentialSource->getAttestationType(),
            ':aaguid' => $credentialSource->getAaguid()->toRfc4122(),
        ]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['error' => $e->getMessage()]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
}