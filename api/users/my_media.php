<?php
// api/users/my_media.php
// Returns a list of media created by the current user.
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';
require_once __DIR__ . '/../../includes/utils.php';

header('Content-Type: application/json');

$user = getCurrentUser();
if (!$user) {
    jsonResponse(['success' => false, 'error' => 'Unauthorized'], 401);
}

$db = getDB();

$query = trim($_GET['q'] ?? '');
$sort = $_GET['sort'] ?? 'new';

$whereClauses = ['m.created_by = :user_id'];
$params = [':user_id' => $user['id']];

if ($query !== '') {
    $whereClauses[] = '(m.title LIKE :query_title OR m.description LIKE :query_desc)';
    $params[':query_title'] = "%{$query}%";
    $params[':query_desc'] = "%{$query}%";
}

$whereSQL = 'WHERE ' . implode(' AND ', $whereClauses);

switch ($sort) {
    case 'popular':
        $orderBy = 'm.vote_score DESC';
        break;
    case 'hot':
        $orderBy = 'm.vote_score DESC, m.created_at DESC'; // Hotness usually involves time decay, but for simplicity, we'll use this.
        break;
    case 'rising':
        $orderBy = 'm.created_at DESC'; // Rising usually involves recent activity, but for simplicity, we'll use this.
        break;
    case 'new':
    default:
        $orderBy = 'm.created_at DESC';
}

$sql = "SELECT 
            m.id, 
            m.title, 
            m.description, 
            m.cover_image, 
            m.created_by, 
            m.vote_score, 
            m.created_at,
            (SELECT COUNT(*) FROM branches WHERE media_id = m.id) AS branch_count,
            (SELECT COUNT(*) FROM segments s JOIN branches b ON s.branch_id = b.id WHERE b.media_id = m.id) AS segment_count,
            (SELECT COUNT(*) FROM comments WHERE target_type = 'media' AND target_id = m.id) AS comment_count
        FROM media m
        {$whereSQL}
        ORDER BY {$orderBy}";

$stmt = $db->prepare($sql);
foreach ($params as $key => $val) {
    $stmt->bindValue($key, $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
}
$stmt->execute();
$media = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonResponse(['success' => true, 'media' => $media]);
