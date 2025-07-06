-- Simplify Backup System
-- Remove complex backup_ tables and create a simple backup tracking table

-- First, drop the complex backup tables
DROP TABLE IF EXISTS `backup_logs`;
DROP TABLE IF EXISTS `backup_schedules`;
DROP TABLE IF EXISTS `backup_endpoints`;

-- Create a simple backup tracking table
CREATE TABLE `backups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `backup_type` enum('database','files','full') NOT NULL,
  `filename` varchar(255) NOT NULL,
  `file_size` bigint(20) DEFAULT NULL,
  `status` enum('in_progress','completed','failed') NOT NULL DEFAULT 'in_progress',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  `error_message` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_backup_type` (`backup_type`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `fk_backups_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Note: This simplified table tracks backup operations with just the essential information
-- Run with: mysql -u username -p database_name < simplify_backup_system.sql