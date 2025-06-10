<?php
// /api/admin/users.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');

$user = getCurrentUser();
if (!$user || !isAdmin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

try {
    $db = getDB();
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $stmt = $db->query("   
            SELECT
                u.id,
                u.username,
                u.email,
                u.is_admin,
                u.is_banned,
                u.created_at,
                u.last_active_at,
                (SELECT COUNT(*) FROM User_Passkeys up WHERE up.user_id = u.id) AS passkey_count,
                (SELECT COUNT(*) FROM Segments s WHERE s.created_by = u.id) AS segments_count,
                (SELECT COUNT(*) FROM Comments c WHERE c.user_id = u.id) AS comments_count
            FROM Users u
            ORDER BY u.created_at DESC
        ");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode(['users' => $users]);
        exit;
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $targetId = isset($data['user_id']) ? intval($data['user_id']) : 0;
        if (!$targetId) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid user_id']);
            exit;
        }
        if (isset($data['is_admin'])) {
            $stmt = $db->prepare("UPDATE Users SET is_admin = ? WHERE id = ?");
            $stmt->execute([intval($data['is_admin']), $targetId]);
        }
        if (isset($data['is_banned'])) {
            $stmt = $db->prepare("UPDATE Users SET is_banned = ? WHERE id = ?");
            $stmt->execute([intval($data['is_banned']), $targetId]);
        }
        echo json_encode(['success' => true]);
        exit;
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        exit;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server Error: ' . $e->getMessage()]);
    exit;
}