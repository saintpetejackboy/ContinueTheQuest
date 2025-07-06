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
        // pagination and search support
        $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
        $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 10;
        $offset = ($page - 1) * $limit;
        $q = isset($_GET['q']) ? trim($_GET['q']) : '';
        $params = [];
        $where = '';
        if ($q !== '') {
            $where = 'WHERE u.username LIKE :q_username OR u.email LIKE :q_email';
            $params[':q_username'] = "%{$q}%";
            $params[':q_email'] = "%{$q}%";
        }
        // total count
        $countStmt = $db->prepare("SELECT COUNT(*) FROM Users u $where");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();
        // fetch paged users with stats
        $sql = "
            SELECT
                u.id,
                u.username,
                u.email,
                u.avatar,
                u.quota,
                u.credits,
                u.is_admin,
                u.is_banned,
                u.created_at,
                u.last_active_at,
                (SELECT COUNT(*) FROM User_Passkeys up WHERE up.user_id = u.id) AS passkey_count,
                (SELECT COUNT(*) FROM Segments s WHERE s.created_by = u.id) AS segments_count,
                (SELECT COUNT(*) FROM Comments c WHERE c.user_id = u.id) AS comments_count,
                (SELECT COUNT(*) FROM Media m WHERE m.created_by = u.id) AS media_count
            FROM Users u
            $where
            ORDER BY u.created_at DESC
            LIMIT :limit OFFSET :offset
        ";
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        // enrich users with usage and URLs
        foreach ($users as &$u) {
            $userDir = getUserUploadDir($u['id']);
            $used = is_dir($userDir) ? getDirSize($userDir) : 0;
            $quotaVal = (int)$u['quota'];
            $percent = $quotaVal > 0 ? round(($used / $quotaVal) * 100, 1) : 0;
            $u['space_used'] = $used;
            $u['space_used_formatted'] = formatFileSize($used);
            $u['quota_formatted'] = formatFileSize($quotaVal);
            $u['percent'] = $percent;
            $u['avatar_url'] = $u['avatar']
                ? "/uploads/users/{$u['id']}/avatars/{$u['avatar']}"
                : null;
        }
        echo json_encode([
            'users' => $users,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
        ]);
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
        if (isset($data['action']) && $data['action'] === 'adjust_credits') {
            $amount = intval($data['amount'] ?? 0);
            $stmt = $db->prepare("UPDATE Users SET credits = credits + ? WHERE id = ?");
            $stmt->execute([$amount, $targetId]);
        }
        if (isset($data['action']) && $data['action'] === 'adjust_quota') {
            $quota = intval($data['quota'] ?? 0);
            $stmt = $db->prepare("UPDATE Users SET quota = ? WHERE id = ?");
            $stmt->execute([$quota, $targetId]);
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