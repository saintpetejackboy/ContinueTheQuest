<?php
// db/migrations/add_mandatory_tags.php
// Add is_mandatory column to tag_links table
require_once __DIR__ . '/../../bootstrap.php';

$db = getDB();

try {
    // Check if is_mandatory column already exists
    $stmt = $db->query("SHOW COLUMNS FROM tag_links LIKE 'is_mandatory'");
    $columnExists = $stmt->rowCount() > 0;
    
    if (!$columnExists) {
        // Add is_mandatory column
        $db->exec("ALTER TABLE tag_links ADD COLUMN is_mandatory TINYINT(1) DEFAULT 0 AFTER tagged_by");
        echo "Added is_mandatory column to tag_links table.\n";
    } else {
        echo "is_mandatory column already exists in tag_links table.\n";
    }
    
    echo "Migration completed successfully.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>