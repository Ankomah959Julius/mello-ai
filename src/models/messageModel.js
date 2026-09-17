import pool from '../config/database.js';

export async function createMessage(conversationId, sender, message, messageType = 'text') {
  const result = await pool.query(
    'INSERT INTO messages (conversation_id, sender, message, message_type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *',
    [conversationId, sender, message, messageType]
  );
  return result.rows[0];
}

export async function getRecentMessages(conversationId, limit = 10) {
  // Fetch last N messages ordered by created_at DESC, then reverse to chronological order (oldest to newest)
  const result = await pool.query(
    'SELECT sender, message FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2',
    [conversationId, limit]
  );

  return result.rows.reverse();
}

export async function clearMessagesForConversation(conversationId) {
  await pool.query('DELETE FROM messages WHERE conversation_id = $1', [conversationId]);
}

export default {
  createMessage,
  getRecentMessages,
  clearMessagesForConversation,
};
