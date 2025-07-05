<?php
// db/migrations/update_segments_table.php
// Remove markdown_body column and add file_path column to segments table
require_once __DIR__ . '/../../bootstrap.php';

$db = getDB();

try {
    // Check if file_path column already exists
    $stmt = $db->query("SHOW COLUMNS FROM segments LIKE 'file_path'");
    $filePathExists = $stmt->rowCount() > 0;
    
    if (!$filePathExists) {
        // Add file_path column
        $db->exec("ALTER TABLE segments ADD COLUMN file_path VARCHAR(255) DEFAULT NULL AFTER title");
        echo "Added file_path column to segments table.\n";
    } else {
        echo "file_path column already exists in segments table.\n";
    }
    
    // Check if markdown_body column exists
    $stmt = $db->query("SHOW COLUMNS FROM segments LIKE 'markdown_body'");
    $markdownBodyExists = $stmt->rowCount() > 0;
    
    if ($markdownBodyExists) {
        // First, migrate any existing markdown_body content to files (if any)
        $stmt = $db->query("SELECT id, title, markdown_body, created_by FROM segments WHERE markdown_body IS NOT NULL AND markdown_body != ''");
        $segments = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        foreach ($segments as $segment) {
            // Create user directory structure
            $userDir = "/var/www/ctq/uploads/users/" . $segment['created_by'];
            $segmentsDir = $userDir . '/segments';
            
            if (!is_dir($segmentsDir)) {
                mkdir($segmentsDir, 0755, true);
            }
            
            // Create file from markdown content
            $filename = 'migrated_segment_' . $segment['id'] . '.md';
            $filepath = $segmentsDir . '/' . $filename;
            
            if (file_put_contents($filepath, $segment['markdown_body'])) {
                // Update segment with file path
                $updateStmt = $db->prepare("UPDATE segments SET file_path = ? WHERE id = ?");
                $updateStmt->execute(['segments/' . $filename, $segment['id']]);
                echo "Migrated segment {$segment['id']} content to file.\n";
            }
        }
        
        // Remove markdown_body column
        $db->exec("ALTER TABLE segments DROP COLUMN markdown_body");
        echo "Removed markdown_body column from segments table.\n";
    } else {
        echo "markdown_body column does not exist in segments table.\n";
    }
    
    echo "Migration completed successfully.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>