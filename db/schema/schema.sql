-- 01_users.sql
CREATE TABLE Users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    passkey_id VARCHAR(255),
    passphrase_hash VARCHAR(255),
    email VARCHAR(255),
    is_admin TINYINT(1) DEFAULT 0,
    is_banned TINYINT(1) DEFAULT 0,
    credit_balance INT DEFAULT 0,
    sort_preference ENUM('new', 'hot', 'rising', 'popular') DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX(username),
    INDEX(email)
);

-- 02_media.sql
CREATE TABLE Media (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    cover_image VARCHAR(255),
    created_by INT,
    vote_score INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX(created_at),
    INDEX(vote_score),
    INDEX(created_by)
);

-- 03_branches.sql
CREATE TABLE Branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    media_id INT,
    title VARCHAR(255),
    summary TEXT,
    branch_type ENUM('before', 'after', 'other'),
    source_type ENUM('book', 'show', 'movie', 'other'),
    cover_image VARCHAR(255),
    created_by INT,
    vote_score INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX(media_id),
    INDEX(created_by),
    INDEX(created_at),
    INDEX(vote_score)
);

-- 04_segments.sql
CREATE TABLE Segments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    branch_id INT,
    title VARCHAR(255),
    markdown_body LONGTEXT,
    image_path VARCHAR(255),
    created_by INT,
    vote_score INT DEFAULT 0,
    order_index INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX(branch_id),
    INDEX(created_by),
    INDEX(order_index),
    INDEX(created_at),
    INDEX(vote_score)
);

-- 05_tags.sql
CREATE TABLE Tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    is_genre TINYINT(1) DEFAULT 0,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX(name),
    INDEX(is_genre),
    INDEX(created_by)
);

CREATE TABLE Tag_Links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tag_id INT,
    target_type ENUM('media', 'branch', 'segment'),
    target_id INT,
    tagged_by INT,
    tagged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX unique_tag_target (tag_id, target_type, target_id),
    INDEX(tag_id),
    INDEX(tagged_by)
);

-- 06_comments_votes.sql
CREATE TABLE Comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    segment_id INT,
    user_id INT,
    body TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_anonymous TINYINT(1) DEFAULT 0,
    INDEX(segment_id),
    INDEX(user_id),
    INDEX(created_at)
);

CREATE TABLE Votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    target_type ENUM('media', 'branch', 'segment'),
    target_id INT,
    vote_value TINYINT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX(user_id),
    INDEX(target_type, target_id),
    INDEX(created_at)
);

-- 07_credits_logs.sql
CREATE TABLE Credits_Log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    change_amount INT,
    reason VARCHAR(255),
    related_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX(user_id),
    INDEX(created_at)
);

-- 08_admin_moderation.sql
CREATE TABLE Admin_Moderation (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    ip_address VARCHAR(45),
    device_hash VARCHAR(255),
    action VARCHAR(255),
    reason TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX(user_id),
    INDEX(action),
    INDEX(created_at)
);


CREATE TABLE Submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('notify','contact') NOT NULL COMMENT 'notify = early-access form; contact = message form',
    name VARCHAR(255) NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NULL,
    message TEXT NULL,
    consent TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1 = user consented',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX(type),
    INDEX(email),
    INDEX(created_at)
);
