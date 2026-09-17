import userModel from '../models/userModel.js';
import conversationModel from '../models/conversationModel.js';
import messageModel from '../models/messageModel.js';
import pool from '../config/database.js';

export async function processUserMessage(identifier = 'web-user-default', userMessageText) {
  // 1. Session / User Resolution
  const user = await userModel.findOrCreateUser(identifier);

  // 2. Active Conversation Resolution
  const conversation = await conversationModel.getActiveConversationForUser(user.id);

  // 3. Fetch Recent History (sliding window, e.g. last 10 messages)
  const history = await messageModel.getRecentMessages(conversation.id, 10);

  return {
    user,
    conversation,
    history,
  };
}

export async function saveExchange(userId, conversationId, userMessageText, assistantReplyText, modelName = 'openai/gpt-oss-20b', tokensUsed = 0) {
  // Database persistence in a transaction or sequential steps
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Save user message
    await client.query(
      'INSERT INTO messages (conversation_id, sender, message, message_type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
      [conversationId, 'user', userMessageText, 'text']
    );

    // Save assistant message
    await client.query(
      'INSERT INTO messages (conversation_id, sender, message, message_type, created_at) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)',
      [conversationId, 'assistant', assistantReplyText, 'text']
    );

    // Update conversation timestamp
    await client.query(
      'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [conversationId]
    );

    // Log AI usage
    if (tokensUsed > 0) {
      await client.query(
        'INSERT INTO ai_usage (user_id, model, tokens_used, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
        [userId, modelName, tokensUsed]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function clearConversationHistory(identifier = 'web-user-default') {
  const user = await userModel.findOrCreateUser(identifier);
  const conversation = await conversationModel.getActiveConversationForUser(user.id);
  await messageModel.clearMessagesForConversation(conversation.id);
  return true;
}

export default {
  processUserMessage,
  saveExchange,
  clearConversationHistory,
};
