<?php
// api/ai/generate.php
// Generate AI story content using OpenAI API
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

$user = getCurrentUser();
if (!$user) {
    jsonResponse(['success' => false, 'error' => 'Not authenticated'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

// Check if OpenAI API key is configured
$apiKey = getenv('OPENAI_API_KEY');
if (!$apiKey) {
    jsonResponse(['success' => false, 'error' => 'AI generation is not configured'], 500);
}

$input = json_decode(file_get_contents('php://input'), true);
$branchId = isset($input['branch_id']) ? (int)$input['branch_id'] : 0;
$title = isset($input['title']) ? trim($input['title']) : '';
$modelName = isset($input['model']) ? trim($input['model']) : '';
$orderIndex = isset($input['order_index']) ? (int)$input['order_index'] : 1;
$prompt = isset($input['prompt']) ? trim($input['prompt']) : '';
$userTags = isset($input['tags']) ? (array)$input['tags'] : [];

if (!$branchId || !$title || !$modelName || !$prompt) {
    jsonResponse(['success' => false, 'error' => 'Missing required fields'], 400);
}

$db = getDB();

// Verify model exists and get cost
$modelStmt = $db->prepare('SELECT id, cost_per_use FROM ai_models WHERE name = ? AND is_active = 1');
$modelStmt->execute([$modelName]);
$model = $modelStmt->fetch(PDO::FETCH_ASSOC);

if (!$model) {
    jsonResponse(['success' => false, 'error' => 'Invalid AI model'], 400);
}

// Check if user can add segments to this branch
$branchStmt = $db->prepare('SELECT created_by FROM branches WHERE id = ?');
$branchStmt->execute([$branchId]);
$branch = $branchStmt->fetch(PDO::FETCH_ASSOC);

if (!$branch) {
    jsonResponse(['success' => false, 'error' => 'Branch not found'], 404);
}

$canEdit = ($user['id'] === (int)$branch['created_by'] || $user['is_admin']);
if (!$canEdit) {
    jsonResponse(['success' => false, 'error' => 'Permission denied'], 403);
}

// Check user has enough credits for generation + user tags
$totalCost = $model['cost_per_use'];
$newUserTags = [];

if (!empty($userTags)) {
    // Check which user tags are new
    $placeholders = str_repeat('?,', count($userTags) - 1) . '?';
    $tagCheckStmt = $db->prepare("SELECT name FROM tags WHERE name IN ($placeholders)");
    $tagCheckStmt->execute($userTags);
    $existingTags = $tagCheckStmt->fetchAll(PDO::FETCH_COLUMN);
    
    $newUserTags = array_diff($userTags, $existingTags);
    $totalCost += count($newUserTags); // 1 credit per new tag
}

if ($user['credits'] < $totalCost) {
    jsonResponse(['success' => false, 'error' => "Insufficient credits. Need $totalCost credits"], 400);
}

// Check storage quota for generated content (estimate ~2KB per generation)
$estimatedSize = 2048; // 2KB estimate
$userDir = "/var/www/ctq/uploads/users/" . $user['id'];
$usedBytes = 0;

if (is_dir($userDir)) {
    $usedBytes = calculateDirectorySize($userDir);
}

$quota = (int)$user['quota'];
$availableBytes = $quota - $usedBytes;

if ($estimatedSize > $availableBytes) {
    jsonResponse(['success' => false, 'error' => 'Insufficient storage space'], 400);
}

try {
    // Call OpenAI API
    $generatedContent = callOpenAI($apiKey, $prompt, $modelName);
    
    if (!$generatedContent) {
        jsonResponse(['success' => false, 'error' => 'AI generation failed'], 500);
    }
    
    // Create user directory structure
    $segmentsDir = $userDir . '/segments';
    if (!is_dir($segmentsDir)) {
        mkdir($segmentsDir, 0755, true);
    }
    
    // Save generated content to file
    $filename = 'ai_segment_' . uniqid() . '.md';
    $filepath = $segmentsDir . '/' . $filename;
    
    if (!file_put_contents($filepath, $generatedContent)) {
        jsonResponse(['success' => false, 'error' => 'Failed to save generated content'], 500);
    }
    
    // Start database transaction
    $db->beginTransaction();
    
    // Create segment record
    $segmentStmt = $db->prepare('INSERT INTO segments (branch_id, title, file_path, created_by, order_index, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
    $segmentStmt->execute([$branchId, $title, 'segments/' . $filename, $user['id'], $orderIndex]);
    $segmentId = $db->lastInsertId();
    
    // Create mandatory AI tags (non-removable)
    $mandatoryTags = ['AI', $modelName];
    $allTagIds = [];
    
    foreach ($mandatoryTags as $tagName) {
        // Check if tag exists
        $tagStmt = $db->prepare('SELECT id FROM tags WHERE name = ?');
        $tagStmt->execute([$tagName]);
        $tagId = $tagStmt->fetchColumn();
        
        if (!$tagId) {
            // Create AI tag (free for system)
            $tagStmt = $db->prepare('INSERT INTO tags (name, created_by, created_at) VALUES (?, ?, NOW())');
            $tagStmt->execute([$tagName, $user['id']]);
            $tagId = $db->lastInsertId();
        }
        
        // Link to segment as mandatory (system-created)
        $linkStmt = $db->prepare('INSERT INTO tag_links (tag_id, target_type, target_id, tagged_by, tagged_at, is_mandatory) VALUES (?, ?, ?, ?, NOW(), 1)');
        $linkStmt->execute([$tagId, 'segment', $segmentId, $user['id']]);
        $allTagIds[] = $tagId;
    }
    
    // Handle user tags
    foreach ($userTags as $tagName) {
        // Check if tag exists
        $tagStmt = $db->prepare('SELECT id FROM tags WHERE name = ?');
        $tagStmt->execute([$tagName]);
        $tagId = $tagStmt->fetchColumn();
        
        if (!$tagId) {
            // Create new user tag (costs credit)
            $tagStmt = $db->prepare('INSERT INTO tags (name, created_by, created_at) VALUES (?, ?, NOW())');
            $tagStmt->execute([$tagName, $user['id']]);
            $tagId = $db->lastInsertId();
        }
        
        // Link to segment as user tag (removable)
        $linkStmt = $db->prepare('INSERT INTO tag_links (tag_id, target_type, target_id, tagged_by, tagged_at, is_mandatory) VALUES (?, ?, ?, ?, NOW(), 0)');
        $linkStmt->execute([$tagId, 'segment', $segmentId, $user['id']]);
        $allTagIds[] = $tagId;
    }
    
    // Deduct credits
    $creditStmt = $db->prepare('UPDATE users SET credits = credits - ? WHERE id = ?');
    $creditStmt->execute([$totalCost, $user['id']]);
    
    // Log credit transaction
    $logStmt = $db->prepare('INSERT INTO credits_log (user_id, change_amount, reason, related_id, created_at) VALUES (?, ?, ?, ?, NOW())');
    $logStmt->execute([$user['id'], -$totalCost, "AI generation ($modelName) + new tags", $segmentId]);
    
    $db->commit();
    
    jsonResponse([
        'success' => true,
        'segment_id' => $segmentId,
        'filename' => $filename,
        'content' => $generatedContent,
        'credits_used' => $totalCost,
        'mandatory_tags' => $mandatoryTags,
        'user_tags' => $userTags
    ]);
    
} catch (Exception $e) {
    $db->rollBack();
    if (isset($filepath) && file_exists($filepath)) {
        unlink($filepath);
    }
    jsonResponse(['success' => false, 'error' => 'Generation failed: ' . $e->getMessage()], 500);
}

function callOpenAI($apiKey, $prompt, $model) {
    // Map our model names to OpenAI API models
    $modelMap = [
        'gpt-4.1' => 'gpt-4',
        'gpt-4.1-mini' => 'gpt-4',
        'gpt-4.1-nano' => 'gpt-3.5-turbo',
        'o3' => 'gpt-4',
        'o3-mini' => 'gpt-4',
        'o3-pro' => 'gpt-4',
        'o4-mini' => 'gpt-4',
        'gpt-4o' => 'gpt-4',
        'gpt-4o-mini' => 'gpt-3.5-turbo'
    ];
    
    $apiModel = $modelMap[$model] ?? 'gpt-3.5-turbo';
    
    $data = [
        'model' => $apiModel,
        'messages' => [
            [
                'role' => 'system',
                'content' => 'You are a creative writer helping to continue a story. Write only the story content, no meta-commentary or explanations.'
            ],
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ],
        'max_tokens' => 1500,
        'temperature' => 0.8
    ];
    
    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ]);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        error_log("OpenAI API error: HTTP $httpCode - $response");
        return false;
    }
    
    $result = json_decode($response, true);
    
    if (!isset($result['choices'][0]['message']['content'])) {
        error_log("OpenAI API invalid response: " . $response);
        return false;
    }
    
    return trim($result['choices'][0]['message']['content']);
}

function calculateDirectorySize($directory) {
    $size = 0;
    if (is_dir($directory)) {
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($directory, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        
        foreach ($files as $file) {
            if ($file->isFile()) {
                $size += $file->getSize();
            }
        }
    }
    return $size;
}
?>