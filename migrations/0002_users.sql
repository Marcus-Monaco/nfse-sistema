CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Superuser: admin@jmsoftware.com / JMSoft@2026
-- Hash SHA-256 simples para demo (em produção usar bcrypt)
INSERT INTO users (email, password_hash, name, role) VALUES
  ('admin@jmsoftware.com', '8c4f89e1a25e7a5f3b9d0c6e2a4f7b1d3e5a8c0f2b4d6e8a1c3f5b7d9e0a2c4f', 'Administrador JM', 'superuser');
