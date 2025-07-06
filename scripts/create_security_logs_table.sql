-- Create security logs table
CREATE TABLE IF NOT EXISTS security_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    details JSON,
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    severity ENUM('INFO', 'WARNING', 'CRITICAL') DEFAULT 'INFO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_event_type (event_type),
    INDEX idx_user_id (user_id),
    INDEX idx_severity (severity),
    INDEX idx_created_at (created_at),
    INDEX idx_ip_address (ip_address)
);