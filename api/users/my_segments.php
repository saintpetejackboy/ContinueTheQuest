<?php
// api/users/my_segments.php
// Returns a list of segments created by the current user.
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

$whereClauses = ['s.created_by = :user_id'];
$params = [':user_id' => $user['id']];

if ($query !== '') {
    $whereClauses[] = '(s.title LIKE :query_title OR s.description LIKE :query_desc)';
    $params[':query_title'] = "%{$query}%";
    $params[':query_desc'] = "%{$query}%";
}

$whereSQL = 'WHERE ' . implode(' AND ', $whereClauses);

switch ($sort) {
    case 'popular':
    case 'hot':
        $orderBy = 's.vote_score DESC, s.created_at DESC';
        break;
    case 'rising':
        $orderBy = 's.created_at DESC';
        break;
    default:
        $orderBy = 's.created_at DESC';
}

$sql = "SELECT 
            s.id, 
            s.title, 
            s.description, 
            s.image_path, 
            s.created_by, 
            s.vote_score, 
            s.created_at,
            (SELECT COUNT(*) FROM comments WHERE target_type = 'segment' AND target_id = s.id) AS comment_count
        FROM segments s
        {$whereSQL}
        ORDER BY {$orderBy}";

$stmt = $db->prepare($sql);
foreach ($params as $key => $val) {
    $stmt->bindValue($key, $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
}
$stmt->execute();
$segments = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonResponse(['success' => true, 'segments' => $segments]);
