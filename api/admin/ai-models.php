<?php
// /api/admin/ai-models.php
// Admin API for managing AI models (CRUD operations)
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

header('Content-Type: application/json');

$user = getCurrentUser();
if (!$user || !isAdmin()) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden: Admin access required']);
    exit;
}

try {
    $db = getDB();
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        // Get all AI models with full details for admin
        $stmt = $db->prepare('
            SELECT 
                id, 
                name, 
                description, 
                is_active, 
                cost_per_use, 
                created_at
            FROM ai_models 
            ORDER BY name ASC
        ');
        $stmt->execute();
        $models = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert is_active to boolean for JavaScript
        foreach ($models as &$model) {
            $model['is_active'] = (bool)$model['is_active'];
        }
        
        echo json_encode([
            'success' => true,
            'models' => $models
        ]);
        exit;
        
    } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $action = $data['action'] ?? '';
        
        switch ($action) {
            case 'create':
                $name = trim($data['name'] ?? '');
                $description = trim($data['description'] ?? '');
                $costPerUse = intval($data['cost_per_use'] ?? 1);
                $isActive = isset($data['is_active']) ? (bool)$data['is_active'] : true;
                
                if (empty($name)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Model name is required']);
                    exit;
                }
                
                if ($costPerUse < 0) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Cost per use must be 0 or positive']);
                    exit;
                }
                
                // Check if model name already exists
                $checkStmt = $db->prepare('SELECT id FROM ai_models WHERE name = ?');
                $checkStmt->execute([$name]);
                if ($checkStmt->fetch()) {
                    http_response_code(409);
                    echo json_encode(['error' => 'A model with this name already exists']);
                    exit;
                }
                
                $stmt = $db->prepare('
                    INSERT INTO ai_models (name, description, is_active, cost_per_use) 
                    VALUES (?, ?, ?, ?)
                ');
                $stmt->execute([$name, $description, $isActive ? 1 : 0, $costPerUse]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'AI model created successfully',
                    'model_id' => $db->lastInsertId()
                ]);
                break;
                
            case 'update':
                $modelId = intval($data['id'] ?? 0);
                $name = trim($data['name'] ?? '');
                $description = trim($data['description'] ?? '');
                $costPerUse = intval($data['cost_per_use'] ?? 1);
                $isActive = isset($data['is_active']) ? (bool)$data['is_active'] : true;
                
                if (!$modelId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Model ID is required']);
                    exit;
                }
                
                if (empty($name)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Model name is required']);
                    exit;
                }
                
                if ($costPerUse < 0) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Cost per use must be 0 or positive']);
                    exit;
                }
                
                // Check if model exists
                $checkStmt = $db->prepare('SELECT id FROM ai_models WHERE id = ?');
                $checkStmt->execute([$modelId]);
                if (!$checkStmt->fetch()) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Model not found']);
                    exit;
                }
                
                // Check if model name already exists (excluding current model)
                $checkStmt = $db->prepare('SELECT id FROM ai_models WHERE name = ? AND id != ?');
                $checkStmt->execute([$name, $modelId]);
                if ($checkStmt->fetch()) {
                    http_response_code(409);
                    echo json_encode(['error' => 'A model with this name already exists']);
                    exit;
                }
                
                $stmt = $db->prepare('
                    UPDATE ai_models 
                    SET name = ?, description = ?, is_active = ?, cost_per_use = ?
                    WHERE id = ?
                ');
                $stmt->execute([$name, $description, $isActive ? 1 : 0, $costPerUse, $modelId]);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'AI model updated successfully'
                ]);
                break;
                
            case 'delete':
                $modelId = intval($data['id'] ?? 0);
                
                if (!$modelId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Model ID is required']);
                    exit;
                }
                
                // Check if model exists
                $checkStmt = $db->prepare('SELECT id, name FROM ai_models WHERE id = ?');
                $checkStmt->execute([$modelId]);
                $model = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$model) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Model not found']);
                    exit;
                }
                
                // TODO: Check if model is being used in any generations/segments
                // For now, we'll allow deletion but could add referential integrity checks
                
                $stmt = $db->prepare('DELETE FROM ai_models WHERE id = ?');
                $stmt->execute([$modelId]);
                
                echo json_encode([
                    'success' => true,
                    'message' => "AI model '{$model['name']}' deleted successfully"
                ]);
                break;
                
            case 'toggle_status':
                $modelId = intval($data['id'] ?? 0);
                $isActive = isset($data['is_active']) ? (bool)$data['is_active'] : true;
                
                if (!$modelId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Model ID is required']);
                    exit;
                }
                
                // Check if model exists
                $checkStmt = $db->prepare('SELECT id, name FROM ai_models WHERE id = ?');
                $checkStmt->execute([$modelId]);
                $model = $checkStmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$model) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Model not found']);
                    exit;
                }
                
                $stmt = $db->prepare('UPDATE ai_models SET is_active = ? WHERE id = ?');
                $stmt->execute([$isActive ? 1 : 0, $modelId]);
                
                $statusText = $isActive ? 'activated' : 'deactivated';
                echo json_encode([
                    'success' => true,
                    'message' => "AI model '{$model['name']}' {$statusText} successfully"
                ]);
                break;
                
            default:
                http_response_code(400);
                echo json_encode(['error' => 'Invalid action']);
                break;
        }
        exit;
        
    } else {
        http_response_code(405);
        echo json_encode(['error' => 'Method Not Allowed']);
        exit;
    }
    
} catch (Exception $e) {
    error_log("AI Models Admin API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Internal server error: ' . $e->getMessage()]);
    exit;
}
?>