<?php
// /api/users/passkeys.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');



$user = getCurrentUser();
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$db = getDB();
$stmt = $db->prepare("
    SELECT 
        id, 
        credential_id, 
        sign_count, 
        created_at, 
        last_used_at,
        transports
    FROM User_Passkeys 
    WHERE user_id = ? 
    ORDER BY created_at DESC
");
$stmt->execute([$user['id']]);
$passkeys = $stmt->fetchAll(PDO::FETCH_ASSOC);



// Format the data for display
$formattedPasskeys = array_map(function($passkey) {
    return [
        'id' => $passkey['id'],
        'created_at' => $passkey['created_at'],
        'last_used' => $passkey['last_used_at'] ? $passkey['last_used_at'] : 'Never',
        'sign_count' => $passkey['sign_count'],
        'transports' => $passkey['transports'] ? explode(',', $passkey['transports']) : []
    ];
}, $passkeys);

echo json_encode(['passkeys' => $formattedPasskeys]);

