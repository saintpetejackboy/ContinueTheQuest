<?php
// db/migrations/update_ai_model_costs.php
// Update AI model costs to new pricing structure
require_once __DIR__ . '/../../bootstrap.php';

$db = getDB();

try {
    // Update model costs
    $models = [
        'gpt-4.1' => 75,
        'gpt-4.1-mini' => 50,
        'gpt-4.1-nano' => 25,
        'o3' => 100,
        'o3-mini' => 60,
        'o3-pro' => 150,
        'o4-mini' => 80,
        'gpt-4o' => 70,
        'gpt-4o-mini' => 50,
    ];
    
    $stmt = $db->prepare('UPDATE ai_models SET cost_per_use = ? WHERE name = ?');
    
    foreach ($models as $name => $cost) {
        $stmt->execute([$cost, $name]);
        echo "Updated $name cost to $cost credits.\n";
    }
    
    echo "Updated AI model costs successfully.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>