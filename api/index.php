<?php
// api/index.php
// API endpoint handler
require __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../includes/utils.php';


// Set JSON header by default
header('Content-Type: application/json');

// Handle CORS if needed (configure for your domain)
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type');

// Get request method and endpoint
$method = $_SERVER['REQUEST_METHOD'];
$endpoint = $_GET['endpoint'] ?? '';

// Route to appropriate handler
try {
    switch ($endpoint) {
        case 'genres':
            handleGenres($method);
            break;
            
        case 'search':
            handleSearch($method);
            break;
			
		case 'submit':
			handleSubmission($method);
			break;

            
        case 'stats':
            handleStats($method);
            break;
            
        default:
            jsonResponse(['error' => 'Invalid endpoint'], 404);
    }
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    jsonResponse(['error' => 'Internal server error'], 500);
}

/**
 * Handle genre-related requests
 */
function handleGenres($method) {
    if ($method !== 'GET') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }

    $db = getDB();
    $stmt = $db->query("SELECT id, name FROM Tags WHERE is_genre = 1 ORDER BY name");
    $genres = $stmt->fetchAll();

    jsonResponse(['genres' => $genres]);
}

function handleSearch($method) {
    if ($method !== 'GET') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }

    $query = trim($_GET['q'] ?? '');
    $sort = $_GET['sort'] ?? 'new';
    $limit = min(intval($_GET['limit'] ?? 20), 100);
    $offset = max(intval($_GET['offset'] ?? 0), 0);
    $genreId = intval($_GET['genre_id'] ?? 0);

    $db = getDB();
    $whereClauses = [];
    $params = [];

    if ($query !== '') {
        $whereClauses[] = '(m.title LIKE :query_title OR m.description LIKE :query_desc)';
        $params[':query_title'] = "%{$query}%";
        $params[':query_desc'] = "%{$query}%";
    }

    if ($genreId) {
        $whereClauses[] = 'EXISTS (
            SELECT 1 FROM tag_links tl
            WHERE tl.target_type = \'media\' AND tl.target_id = m.id AND tl.tag_id = :genre_id
        )';
        $params[':genre_id'] = $genreId;
    }

    $whereSQL = $whereClauses ? 'WHERE ' . implode(' AND ', $whereClauses) : '';

    switch ($sort) {
        case 'popular':
        case 'hot':
            $orderBy = 'm.vote_score DESC, m.created_at DESC';
            break;
        case 'rising':
            $orderBy = 'm.created_at DESC';
            break;
        default:
            $orderBy = 'm.created_at DESC';
    }

    $sql = "SELECT m.id, m.title, m.description, m.cover_image, m.created_by, m.vote_score, m.created_at,
                   COALESCE(
                       m.cover_image,
                       (SELECT b.cover_image FROM branches b WHERE b.media_id = m.id AND b.cover_image IS NOT NULL ORDER BY b.created_at DESC LIMIT 1),
                       (SELECT s.image_path FROM segments s JOIN branches b ON s.branch_id = b.id WHERE b.media_id = m.id AND s.image_path IS NOT NULL ORDER BY s.created_at DESC LIMIT 1),
                       (SELECT mi.file_name FROM media_images mi WHERE mi.media_id = m.id AND mi.hidden = 0 ORDER BY mi.vote_score DESC, mi.created_at DESC LIMIT 1)
                   ) AS display_image,
                   (SELECT COUNT(*) FROM branches WHERE media_id = m.id) AS branch_count,
                   (SELECT COUNT(*) FROM segments s JOIN branches b ON s.branch_id = b.id WHERE b.media_id = m.id) AS segment_count,
                   (SELECT COUNT(*) FROM comments WHERE target_type = 'media' AND target_id = m.id) AS comment_count
            FROM media m
            {$whereSQL}
            ORDER BY {$orderBy}
            LIMIT :limit OFFSET :offset";

    $stmt = $db->prepare($sql);

    // Bind dynamic search parameters
    foreach ($params as $key => $val) {
        $stmt->bindValue($key, $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
    }

    // Bind limit/offset
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse(['results' => $results]);
}


/**
 * Handle stats requests
 */
function handleStats($method) {
    if ($method !== 'GET') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $db = getDB();
    
    // Get basic stats
    $stats = [
        'total_media' => $db->query("SELECT COUNT(*) FROM Media")->fetchColumn(),
        'total_branches' => $db->query("SELECT COUNT(*) FROM Branches")->fetchColumn(),
        'total_users' => $db->query("SELECT COUNT(*) FROM Users")->fetchColumn(),
        'recent_activity' => []
    ];
    
    jsonResponse(['stats' => $stats]);
}

/**
 * Handle both notify and contact form POSTS
 */
function handleSubmission($method) {
	error_log(' there is no method coming over: '.$method);
    if ($method !== 'POST') {
        jsonResponse(['error'=>'Metho...d not allowed'], 405);
    }

    // parse JSON body
    $data = json_decode(file_get_contents('php://input'), true) ?: [];
    $type    = $data['type'] ?? '';
    $email   = filter_var($data['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $name    = trim($data['name'] ?? null);
    $subject = trim($data['subject'] ?? null);
    $message = trim($data['message'] ?? null);
    $consent = isset($data['consent']) && $data['consent'] ? 1 : 0;

    if (! in_array($type, ['notify','contact']) || ! $email || ! $consent) {
        jsonResponse(['error'=>'Invalid submission'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("
        INSERT INTO Submissions
          (type, name, email, subject, message, consent)
        VALUES
          (:type, :name, :email, :subject, :message, :consent)
    ");
    $stmt->execute([
        ':type'    => $type,
        ':name'    => $name,
        ':email'   => $email,
        ':subject' => $subject,
        ':message' => $message,
        ':consent' => $consent,
    ]);

    jsonResponse(['success'=>true]);
}
