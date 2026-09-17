import pool from '../config/database.js';

const createTablesText = `
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  whatsapp_number VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS user_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(20) DEFAULT 'English',
  response_style VARCHAR(30) DEFAULT 'normal'
);

CREATE TABLE IF NOT EXISTS conversations (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'assistant', 'system')),
  message TEXT NOT NULL,
  message_type VARCHAR(30) DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  tokens_used INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_whatsapp ON users(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
`;

async function runMigrations() {
  console.log('[MIGRATE] Verifying database connection...');
  try {
    const res = await pool.query('SELECT NOW()');
    console.log(`[MIGRATE] Connection verified successfully at ${res.rows[0].now}`);
  } catch (err) {
    console.error('[MIGRATE] Failed to connect to the database:', err.message);
    process.exit(1);
  }

  console.log('[MIGRATE] Running database migrations...');
  try {
    await pool.query(createTablesText);
    console.log('[MIGRATE] Migrations completed successfully.');
  } catch (err) {
    console.error('[MIGRATE] Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
