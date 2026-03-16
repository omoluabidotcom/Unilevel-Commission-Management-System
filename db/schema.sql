-- Unilevel Commission Management System
-- MySQL schema + sample seed data + example queries
--
-- Usage (example):
--   mysql -u root -p < db/schema.sql

-- ===========================================
-- TABLES
-- ===========================================

CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  phone VARCHAR(30),
  profile_picture VARCHAR(255) DEFAULT NULL,   -- path e.g. /uploads/abc.jpg
  role ENUM('admin', 'distributor') NOT NULL DEFAULT 'distributor',
  sponsor_id BIGINT UNSIGNED DEFAULT NULL,     -- self-reference for upline
  is_active BOOLEAN DEFAULT TRUE,
  
  -- NEW FIELDS (recommended additions)
  last_login TIMESTAMP NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sponsor (sponsor_id),
  INDEX idx_email (email),
  FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Monthly purchases / qualifying volume - ENHANCED
CREATE TABLE purchases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  period CHAR(7) NOT NULL,          -- '2026-03'
  amount DECIMAL(12,2) NOT NULL,
  
  -- NEW FIELDS (recommended additions)
  product_details JSON NULL,        -- Store what was purchased
  transaction_id VARCHAR(100) UNIQUE NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Commission earnings per period (pre-calculated) - ENHANCED
CREATE TABLE commissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  period CHAR(7) NOT NULL,          -- '2026-03'
  personal_amount DECIMAL(12,2) DEFAULT 0,
  downline_amount DECIMAL(12,2) DEFAULT 0,
  total_commission DECIMAL(12,2) NOT NULL,
  status ENUM('pending', 'approved', 'paid') DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  
  -- NEW FIELD (recommended addition)
  breakdown JSON NULL,              -- Store level-by-level commission breakdown
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_period (user_id, period),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Commission configuration (global) - EXISTING
CREATE TABLE settings (
  id TINYINT UNSIGNED PRIMARY KEY,
  min_monthly_purchase DECIMAL(12,2) DEFAULT 50.00,
  currency_code CHAR(3) DEFAULT 'USD',
  commission_percentage JSON NOT NULL   -- e.g. {"personal":10, "level1":8, "level2":5, ...}
);

-- NEW TABLE: System notifications
CREATE TABLE notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED DEFAULT NULL,    -- NULL = system-wide notification
  type ENUM('info', 'success', 'warning', 'error') NOT NULL DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,               -- optional: auto-expire old notifications
  
  INDEX idx_user_read (user_id, is_read),
  INDEX idx_created (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===========================================
-- SAMPLE DATA INSERTION
-- ===========================================

-- Insert default settings
INSERT INTO settings (id, min_monthly_purchase, currency_code, commission_percentage) VALUES
(1, 50.00, 'USD', '{"personal": 10, "level1": 8, "level2": 5, "level3": 3, "level4": 2, "level5": 1}');

-- Sample admin user
INSERT INTO users (username, email, password_hash, full_name, role, is_active, email_verified) VALUES
('admin', 'admin@commissionhub.com', '$2b$10$example.hash.here', 'Admin User', 'admin', TRUE, TRUE);

-- Sample distributors
INSERT INTO users (username, email, password_hash, full_name, role, sponsor_id, is_active) VALUES
('john_doe', 'john@example.com', '$2b$10$example.hash.here', 'John Doe', 'distributor', 1, TRUE),
('jane_smith', 'jane@example.com', '$2b$10$example.hash.here', 'Jane Smith', 'distributor', 1, TRUE),
('mike_johnson', 'mike@example.com', '$2b$10$example.hash.here', 'Mike Johnson', 'distributor', 2, TRUE);

-- Sample purchases for current period
INSERT INTO purchases (user_id, period, amount, product_details, transaction_id) VALUES
(2, '2026-03', 150.00, '{"items": ["Product A", "Product B"]}', 'TXN-2026-03-001'),
(3, '2026-03', 200.00, '{"items": ["Product C"]}', 'TXN-2026-03-002'),
(4, '2026-03', 75.00, '{"items": ["Product A"]}', 'TXN-2026-03-003');

-- Sample commissions
INSERT INTO commissions (user_id, period, personal_amount, downline_amount, total_commission, status, breakdown) VALUES
(2, '2026-03', 15.00, 8.00, 23.00, 'pending', '{"personal": 15.00, "level1": 8.00}'),
(3, '2026-03', 20.00, 12.00, 32.00, 'pending', '{"personal": 20.00, "level1": 12.00}');

-- Sample notifications
INSERT INTO notifications (user_id, type, title, message) VALUES
(NULL, 'info', 'System Maintenance', 'Scheduled maintenance will occur tonight from 2-4 AM EST'),
(1, 'success', 'New Registration', 'John Doe has registered as a new distributor'),
(NULL, 'warning', 'Minimum Purchase Alert', '5 distributors are below the minimum purchase requirement');

-- ===========================================
-- USEFUL QUERIES (examples)
-- ===========================================

-- NOTE:
-- The queries below are examples to copy/paste and run manually.
-- They are commented out so `db/schema.sql` can be executed as an init script.

-- -- Get user's downline network (recursive CTE)
-- WITH RECURSIVE downline AS (
--   SELECT id, username, full_name, sponsor_id, 0 as level
--   FROM users
--   WHERE id = ? -- user_id parameter
--
--   UNION ALL
--
--   SELECT u.id, u.username, u.full_name, u.sponsor_id, d.level + 1
--   FROM users u
--   JOIN downline d ON u.sponsor_id = d.id
--   WHERE d.level < 5 -- limit depth
-- )
-- SELECT * FROM downline ORDER BY level, id;

-- -- Calculate monthly commissions for a user
-- SELECT
--   u.username,
--   c.period,
--   c.personal_amount,
--   c.downline_amount,
--   c.total_commission,
--   c.status
-- FROM commissions c
-- JOIN users u ON c.user_id = u.id
-- WHERE c.user_id = ? AND c.period = ?
-- ORDER BY c.period DESC;

-- -- Get distributors below minimum purchase
-- SELECT
--   u.username,
--   u.email,
--   u.full_name,
--   COALESCE(SUM(p.amount), 0) as current_purchase,
--   s.min_monthly_purchase as minimum_required,
--   CASE
--     WHEN COALESCE(SUM(p.amount), 0) >= s.min_monthly_purchase THEN 'Qualified'
--     ELSE 'Below Minimum'
--   END as status
-- FROM users u
-- CROSS JOIN settings s
-- LEFT JOIN purchases p ON u.id = p.user_id AND p.period = DATE_FORMAT(CURRENT_DATE, '%Y-%m')
-- WHERE u.role = 'distributor' AND u.is_active = TRUE
-- GROUP BY u.id, u.username, u.email, u.full_name, s.min_monthly_purchase
-- HAVING current_purchase < minimum_required
-- ORDER BY current_purchase ASC;

-- -- Get unread notifications for user
-- SELECT * FROM notifications
-- WHERE (user_id = ? OR user_id IS NULL) AND is_read = FALSE
-- ORDER BY created_at DESC;

