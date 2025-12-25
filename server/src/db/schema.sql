-- PartyJeoparty Database Schema

-- Drop tables if they exist (for development)
DROP TABLE IF EXISTS decks;

-- Decks table: stores reusable game setups
CREATE TABLE decks (
  id CHAR(36) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  setup_json LONGTEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at),
  INDEX idx_title (title)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
