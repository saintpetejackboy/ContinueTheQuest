<?php
// API endpoint handler
require __DIR__ . '/../bootstrap.php';
require_once __DIR__ . '/../includes/utils.php';

// Start session for CSRF
session_start();

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

    error_log('handleGenres reached');   // ← log right away

    $db = getDB();
    $stmt = $db->query("SELECT id, name FROM Tags WHERE is_genre = 1 ORDER BY name");
    $genres = $stmt->fetchAll();

    error_log('Found '. count($genres) .' genres');   // ← check how many

    jsonResponse(['genres' => $genres]);
}

/**
 * Handle search requests
 */
function handleSearch($method) {
    if ($method !== 'GET') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    
    $query = $_GET['q'] ?? '';
    if (strlen($query) < 3) {
        jsonResponse(['results' => []]);
    }
    
    // TODO: Implement actual search
    jsonResponse(['results' => [], 'query' => $query]);
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
