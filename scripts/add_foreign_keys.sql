-- Add Missing Foreign Key Constraints
-- Based on analysis in RECOMMENDATIONS.md
-- IMPORTANT: Run this AFTER adding indexes to avoid performance issues

-- Foreign keys for admin_moderation table
ALTER TABLE admin_moderation 
ADD CONSTRAINT fk_admin_moderation_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Foreign keys for branches table
ALTER TABLE branches 
ADD CONSTRAINT fk_branches_media_id 
FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE;

ALTER TABLE branches 
ADD CONSTRAINT fk_branches_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Foreign keys for comments table
ALTER TABLE comments 
ADD CONSTRAINT fk_comments_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Foreign keys for credits_log table
ALTER TABLE credits_log 
ADD CONSTRAINT fk_credits_log_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Foreign keys for media table
ALTER TABLE media 
ADD CONSTRAINT fk_media_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Foreign keys for media_images table
ALTER TABLE media_images 
ADD CONSTRAINT fk_media_images_media_id 
FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE;

-- Foreign keys for segments table
ALTER TABLE segments 
ADD CONSTRAINT fk_segments_branch_id 
FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE;

ALTER TABLE segments 
ADD CONSTRAINT fk_segments_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Foreign keys for tag_links table
ALTER TABLE tag_links 
ADD CONSTRAINT fk_tag_links_tag_id 
FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;

ALTER TABLE tag_links 
ADD CONSTRAINT fk_tag_links_tagged_by 
FOREIGN KEY (tagged_by) REFERENCES users(id) ON DELETE SET NULL;

-- Foreign keys for tags table
ALTER TABLE tags 
ADD CONSTRAINT fk_tags_created_by 
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Foreign keys for votes table
ALTER TABLE votes 
ADD CONSTRAINT fk_votes_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Note: These constraints will ensure data integrity
-- Some constraints use SET NULL to preserve content when users are deleted
-- Run with: mysql -u username -p database_name < add_foreign_keys.sql