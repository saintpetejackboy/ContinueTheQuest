<?php
// db/migrations/add_segment_description.php
// Add description column to segments table
require_once __DIR__ . '/../../bootstrap.php';

$db = getDB();

try {
    // Check if description column already exists
    $stmt = $db->query("SHOW COLUMNS FROM segments LIKE 'description'");
    $columnExists = $stmt->rowCount() > 0;
    
    if (!$columnExists) {
        // Add description column
        $db->exec("ALTER TABLE segments ADD COLUMN description TEXT DEFAULT NULL AFTER title");
        echo "Added description column to segments table.\n";
    } else {
        echo "description column already exists in segments table.\n";
    }
    
    echo "Migration completed successfully.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>