<?php
// /api/admin/submissions.php
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
        $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 20;
        $offset = ($page - 1) * $limit;
        $q = isset($_GET['q']) ? trim($_GET['q']) : '';
        $type = isset($_GET['type']) ? trim($_GET['type']) : '';
        
        $params = [];
        $where = [];
        
        if ($q !== '') {
            $where[] = '(s.email LIKE :q_email OR s.name LIKE :q_name OR s.subject LIKE :q_subject OR s.message LIKE :q_message)';
            $params[':q_email'] = "%{$q}%";
            $params[':q_name'] = "%{$q}%";
            $params[':q_subject'] = "%{$q}%";
            $params[':q_message'] = "%{$q}%";
        }
        
        if ($type !== '' && in_array($type, ['notify', 'contact'])) {
            $where[] = 's.type = :type';
            $params[':type'] = $type;
        }
        
        $whereClause = !empty($where) ? 'WHERE ' . implode(' AND ', $where) : '';
        
        // total count
        $countStmt = $db->prepare("SELECT COUNT(*) FROM submissions s $whereClause");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();
        
        // fetch paged submissions
        $sql = "
            SELECT
                s.id,
                s.type,
                s.name,
                s.email,
                s.subject,
                s.message,
                s.consent,
                s.created_at
            FROM submissions s
            $whereClause
            ORDER BY s.created_at DESC
            LIMIT :limit OFFSET :offset
        ";
        
        $stmt = $db->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val, PDO::PARAM_STR);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // format timestamps for display
        foreach ($submissions as &$submission) {
            $submission['created_at_formatted'] = date('M j, Y g:i A', strtotime($submission['created_at']));
        }
        
        echo json_encode([
            'submissions' => $submissions,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
        ]);
        exit;
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $submissionId = isset($data['id']) ? intval($data['id']) : 0;
        
        if (!$submissionId) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid submission ID']);
            exit;
        }
        
        $stmt = $db->prepare("DELETE FROM submissions WHERE id = ?");
        $stmt->execute([$submissionId]);
        
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