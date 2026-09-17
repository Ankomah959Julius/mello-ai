import pool from '../config/database.js';

export async function getActiveConversationForUser(userId) {
  // Get the most recent conversation for the user, or create one if none exists
  let result = await pool.query(
    'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
    [userId]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Create new conversation
  return await createConversation(userId, 'Web Chat Conversation');
}

export async function createConversation(userId, title = 'New Conversation') {
  const result = await pool.query(
    'INSERT INTO conversations (user_id, title, created_at, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING *',
    [userId, title]
  );
  return result.rows[0];
}

export async function updateConversationTimestamp(conversationId) {
  await pool.query(
    'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [conversationId]
  );
}

export default {
  getActiveConversationForUser,
  createConversation,
  updateConversationTimestamp,
};
