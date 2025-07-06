-- Add Missing Database Indexes for Performance
-- Based on analysis in RECOMMENDATIONS.md

-- Indexes for admin_moderation table
ALTER TABLE admin_moderation ADD INDEX idx_ip_address (ip_address);
ALTER TABLE admin_moderation ADD INDEX idx_device_hash (device_hash);
ALTER TABLE admin_moderation ADD INDEX idx_user_id (user_id);

-- Indexes for branches table
ALTER TABLE branches ADD INDEX idx_media_id (media_id);
ALTER TABLE branches ADD INDEX idx_created_by (created_by);
ALTER TABLE branches ADD INDEX idx_created_at (created_at);

-- Indexes for comments table
ALTER TABLE comments ADD INDEX idx_user_id (user_id);
ALTER TABLE comments ADD INDEX idx_created_at (created_at);

-- Indexes for credits_log table
ALTER TABLE credits_log ADD INDEX idx_related_id (related_id);
ALTER TABLE credits_log ADD INDEX idx_user_id_created (user_id, created_at);

-- Indexes for media table
ALTER TABLE media ADD INDEX idx_created_by (created_by);
ALTER TABLE media ADD INDEX idx_created_at (created_at);

-- Indexes for media_images table
ALTER TABLE media_images ADD INDEX idx_media_id (media_id);

-- Indexes for segments table
ALTER TABLE segments ADD INDEX idx_branch_id (branch_id);
ALTER TABLE segments ADD INDEX idx_created_by (created_by);
ALTER TABLE segments ADD INDEX idx_created_at (created_at);

-- Indexes for tag_links table
ALTER TABLE tag_links ADD INDEX idx_target (target_type, target_id);
ALTER TABLE tag_links ADD INDEX idx_tagged_by (tagged_by);
ALTER TABLE tag_links ADD INDEX idx_tag_id (tag_id);

-- Indexes for tags table
ALTER TABLE tags ADD INDEX idx_created_by (created_by);
ALTER TABLE tags ADD INDEX idx_is_genre (is_genre);

-- Indexes for votes table
ALTER TABLE votes ADD INDEX idx_target (target_type, target_id);
ALTER TABLE votes ADD INDEX idx_user_id (user_id);
ALTER TABLE votes ADD INDEX idx_created_at (created_at);

-- Compound indexes for common query patterns
ALTER TABLE segments ADD INDEX idx_branch_created (branch_id, created_at);
ALTER TABLE comments ADD INDEX idx_target_created (target_type, target_id, created_at);
ALTER TABLE votes ADD INDEX idx_target_user (target_type, target_id, user_id);
ALTER TABLE tag_links ADD INDEX idx_target_tag (target_type, target_id, tag_id);

-- Note: These indexes will significantly improve query performance
-- Run with: mysql -u username -p database_name < add_missing_indexes.sql