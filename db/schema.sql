-- Schema for unilevel commission system

CREATE DATABASE IF NOT EXISTS unilevel_db;
USE unilevel_db;

-- Users (both Admin & Distributors)
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100),
  phone VARCHAR(30),
  profile_picture VARCHAR(255) DEFAULT NULL,
  next_of_kin JSON DEFAULT NULL,
  role ENUM('admin', 'distributor') NOT NULL DEFAULT 'distributor',
  sponsor_id BIGINT UNSIGNED DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sponsor (sponsor_id),
  INDEX idx_email (email),
  FOREIGN KEY (sponsor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Monthly purchases / qualifying volume
CREATE TABLE IF NOT EXISTS purchases (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  period CHAR(7) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Commission earnings per period (pre-calculated)
CREATE TABLE IF NOT EXISTS commissions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  period CHAR(7) NOT NULL,
  personal_amount DECIMAL(12,2) DEFAULT 0,
  downline_amount DECIMAL(12,2) DEFAULT 0,
  total_commission DECIMAL(12,2) NOT NULL,
  status ENUM('pending', 'approved', 'paid') DEFAULT 'pending',
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_period (user_id, period),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Commission configuration (global)
CREATE TABLE IF NOT EXISTS settings (
  id TINYINT UNSIGNED PRIMARY KEY,
  min_monthly_purchase DECIMAL(12,2) DEFAULT 50.00,
  currency_code CHAR(3) DEFAULT 'USD',
  commission_percentage JSON NOT NULL
);

-- Seed a default admin and distributor (password is "password")
INSERT INTO users (username, email, password_hash, full_name, role)
VALUES
  ('admin', 'admin@example.com', '$2a$10$/hdq2Id5qeh/EQX313F9SeXhosuituKEGU.373f01AyxYkNUs/Gta', 'Admin User', 'admin'),
  ('distributor', 'distributor@example.com', '$2a$10$/hdq2Id5qeh/EQX313F9SeXhosuituKEGU.373f01AyxYkNUs/Gta', 'Distributor User', 'distributor')
ON DUPLICATE KEY UPDATE email = email;
