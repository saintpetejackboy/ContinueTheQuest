<?php
// db/migrations/add_ai_models.php
// Create ai_models table and populate with initial data
require_once __DIR__ . '/../../bootstrap.php';

$db = getDB();

try {
    // Create ai_models table
    $createTableSQL = "
    CREATE TABLE IF NOT EXISTS `ai_models` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `name` varchar(255) NOT NULL,
        `description` text DEFAULT NULL,
        `is_active` tinyint(1) DEFAULT 1,
        `cost_per_use` int(11) DEFAULT 1,
        `created_at` datetime DEFAULT current_timestamp(),
        PRIMARY KEY (`id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ";
    
    $db->exec($createTableSQL);
    echo "Created ai_models table successfully.\n";
    
    // Insert initial AI models
    $models = [
        ['name' => 'gpt-4.1', 'description' => 'Latest GPT-4.1 model with enhanced capabilities', 'cost_per_use' => 2],
        ['name' => 'gpt-4.1-mini', 'description' => 'Smaller, faster version of GPT-4.1', 'cost_per_use' => 1],
        ['name' => 'gpt-4.1-nano', 'description' => 'Ultra-lightweight GPT-4.1 for quick responses', 'cost_per_use' => 1],
        ['name' => 'o3', 'description' => 'OpenAI O3 reasoning model', 'cost_per_use' => 3],
        ['name' => 'o3-mini', 'description' => 'Smaller O3 reasoning model', 'cost_per_use' => 2],
        ['name' => 'o3-pro', 'description' => 'Professional O3 model with enhanced reasoning', 'cost_per_use' => 5],
        ['name' => 'o4-mini', 'description' => 'Next-generation O4 mini model', 'cost_per_use' => 2],
        ['name' => 'gpt-4o', 'description' => 'GPT-4 Optimized for creative writing', 'cost_per_use' => 2],
        ['name' => 'gpt-4o-mini', 'description' => 'Smaller GPT-4 Optimized model', 'cost_per_use' => 1],
    ];
    
    $stmt = $db->prepare('INSERT INTO ai_models (name, description, cost_per_use) VALUES (?, ?, ?)');
    
    foreach ($models as $model) {
        $stmt->execute([$model['name'], $model['description'], $model['cost_per_use']]);
    }
    
    echo "Inserted " . count($models) . " AI models successfully.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>