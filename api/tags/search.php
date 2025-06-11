<?php
// /api/tags/search.php
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$query = trim($_GET['q'] ?? '');
$limit = min(intval($_GET['limit'] ?? 20), 50); // Max 50 results

if (strlen($query) < 1) {
    echo json_encode(['tags' => []]);
    exit;
}

try {
    $db = getDB();
    
    // Search for tags that match the query
    $stmt = $db->prepare('
        SELECT name, COUNT(tl.id) as usage_count 
        FROM tags t 
        LEFT JOIN tag_links tl ON t.id = tl.tag_id 
        WHERE t.name LIKE ? 
        GROUP BY t.id, t.name 
        ORDER BY usage_count DESC, t.name ASC 
        LIMIT ?
    ');
    
    $searchTerm = '%' . $query . '%';
    $stmt->execute([$searchTerm, $limit]);
    $tags = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo json_encode(['tags' => $tags]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
