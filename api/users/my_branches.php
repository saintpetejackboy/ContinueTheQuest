<?php
// api/users/my_branches.php
// Returns a list of branches created by the current user.
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

$whereClauses = ['b.created_by = :user_id'];
$params = [':user_id' => $user['id']];

if ($query !== '') {
    $whereClauses[] = '(b.title LIKE :query_title OR b.summary LIKE :query_summary)';
    $params[':query_title'] = "%{$query}%";
    $params[':query_summary'] = "%{$query}%";
}

$whereSQL = 'WHERE ' . implode(' AND ', $whereClauses);

switch ($sort) {
    case 'popular':
    case 'hot':
        $orderBy = 'b.vote_score DESC, b.created_at DESC';
        break;
    case 'rising':
        $orderBy = 'b.created_at DESC';
        break;
    default:
        $orderBy = 'b.created_at DESC';
}

$sql = "SELECT 
            b.id, 
            b.title, 
            b.summary, 
            b.branch_type, 
            b.source_type, 
            b.vote_score, 
            b.created_at, 
            b.created_by,
            COALESCE(
                b.cover_image,
                (SELECT s.image_path FROM segments s WHERE s.branch_id = b.id AND s.image_path IS NOT NULL ORDER BY s.created_at DESC LIMIT 1)
            ) AS display_image,
            (SELECT COUNT(*) FROM segments s WHERE s.branch_id = b.id) AS segment_count,
            (SELECT COUNT(*) FROM comments c JOIN segments s ON c.target_id = s.id WHERE c.target_type = 'segment' AND s.branch_id = b.id) AS comment_count
        FROM branches b
        {$whereSQL}
        ORDER BY {$orderBy}";

$stmt = $db->prepare($sql);
foreach ($params as $key => $val) {
    $stmt->bindValue($key, $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
}
$stmt->execute();
$branches = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonResponse(['success' => true, 'branches' => $branches]);
