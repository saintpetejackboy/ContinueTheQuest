#!/usr/bin/env php
<?php
/**
 * Automated backup scheduler
 * Run this script via cron: 0 2 * * * /usr/bin/php /var/www/ctq/scripts/backup_scheduler.php
 */

require_once __DIR__ . '/../bootstrap.php';

$db = getDB();

try {
    // Get current time
    $now = new DateTime();
    
    // Create daily backup
    if ($now->format('H') == '02') { // 2 AM
        createDatabaseBackup();
        echo "Daily database backup created\n";
    }
    
    // Create weekly full backup on Sundays
    if ($now->format('w') == '0' && $now->format('H') == '03') { // Sunday 3 AM
        createFullBackup();
        echo "Weekly full backup created\n";
    }
    
    // Cleanup old backups (keep 30 days)
    cleanupOldBackups();
    
} catch (Exception $e) {
    error_log("Backup scheduler error: " . $e->getMessage());
    echo "Error: " . $e->getMessage() . "\n";
}

function createDatabaseBackup() {
    $timestamp = date('Y-m-d_H-i-s');
    $filename = "backup_database_{$timestamp}.sql";
    $filepath = "/var/www/ctq/backups/{$filename}";
    
    // Ensure backup directory exists
    if (!is_dir('/var/www/ctq/backups')) {
        mkdir('/var/www/ctq/backups', 0755, true);
    }
    
    // Create database dump
    $command = "mysqldump -u root -p ctq > {$filepath}";
    exec($command, $output, $returnCode);
    
    if ($returnCode === 0) {
        // Log backup in database
        $db = getDB();
        $stmt = $db->prepare('INSERT INTO backups (backup_type, filename, status, file_size, created_by, created_at, completed_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())');
        $fileSize = file_exists($filepath) ? filesize($filepath) : 0;
        $stmt->execute(['database', $filename, 'completed', $fileSize, 1]); // System user
    }
}

function createFullBackup() {
    $timestamp = date('Y-m-d_H-i-s');
    $filename = "backup_full_{$timestamp}.tar.gz";
    $filepath = "/var/www/ctq/backups/{$filename}";
    
    // Create full backup (excluding backups directory itself)
    $command = "tar -czf {$filepath} --exclude=/var/www/ctq/backups /var/www/ctq";
    exec($command, $output, $returnCode);
    
    if ($returnCode === 0) {
        // Log backup in database
        $db = getDB();
        $stmt = $db->prepare('INSERT INTO backups (backup_type, filename, status, file_size, created_by, created_at, completed_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())');
        $fileSize = file_exists($filepath) ? filesize($filepath) : 0;
        $stmt->execute(['full', $filename, 'completed', $fileSize, 1]); // System user
    }
}

function cleanupOldBackups() {
    $cutoffDate = date('Y-m-d H:i:s', strtotime('-30 days'));
    
    $db = getDB();
    
    // Get old backup records
    $stmt = $db->prepare('SELECT filename FROM backups WHERE created_at < ? AND status = "completed"');
    $stmt->execute([$cutoffDate]);
    $oldBackups = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    // Delete files and database records
    foreach ($oldBackups as $filename) {
        $filepath = "/var/www/ctq/backups/{$filename}";
        if (file_exists($filepath)) {
            unlink($filepath);
        }
    }
    
    // Delete database records
    $deleteStmt = $db->prepare('DELETE FROM backups WHERE created_at < ? AND status = "completed"');
    $deleteStmt->execute([$cutoffDate]);
    
    echo "Cleaned up " . count($oldBackups) . " old backup files\n";
}
?>