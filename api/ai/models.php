<?php
// api/ai/models.php
// Get available AI models for generation
require_once __DIR__ . '/../../bootstrap.php';
require_once __DIR__ . '/../../includes/auth.php';

$db = getDB();

// Get all active AI models
$stmt = $db->prepare('SELECT id, name, description, cost_per_use FROM ai_models WHERE is_active = 1 ORDER BY name');
$stmt->execute();
$models = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonResponse([
    'success' => true,
    'models' => $models
]);