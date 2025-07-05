<?php
// api/users/my_comments.php
// Returns a list of comments posted by the current user.
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

$whereClauses = ['c.user_id = :user_id'];
$params = [':user_id' => $user['id']];

if ($query !== '') {
    $whereClauses[] = 'c.body LIKE :query_body';
    $params[':query_body'] = "%{$query}%";
}

$whereSQL = 'WHERE ' . implode(' AND ', $whereClauses);

switch ($sort) {
    case 'popular':
    case 'hot':
        $orderBy = 'c.vote_score DESC, c.created_at DESC';
        break;
    default:
        $orderBy = 'c.created_at DESC';
}

$sql = "SELECT 
            c.id, 
            c.body, 
            c.target_type, 
            c.target_id, 
            c.vote_score, 
            c.created_at
        FROM comments c
        {$whereSQL}
        ORDER BY {$orderBy}";

$stmt = $db->prepare($sql);
foreach ($params as $key => $val) {
    $stmt->bindValue($key, $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
}
$stmt->execute();
$comments = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonResponse(['success' => true, 'comments' => $comments]);
