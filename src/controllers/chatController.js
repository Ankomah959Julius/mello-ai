import aiService from '../services/aiService.js';
import conversationService from '../services/conversationService.js';

export const handleChat = async (req, res, next) => {
  try {
    const { message, userId: rawUserId } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required and must be a non-empty string.',
      });
    }

    const cleanMessage = message.trim();
    const identifier = rawUserId ? String(rawUserId) : 'web-user-default';

    // Handle /clear command
    if (cleanMessage.toLowerCase() === '/clear') {
      await conversationService.clearConversationHistory(identifier);
      return res.status(200).json({
        status: 'success',
        reply: 'Conversation history cleared.',
      });
    }

    // 1. Get user, conversation, and history context from Postgres
    const { user, conversation, history } = await conversationService.processUserMessage(identifier, cleanMessage);

    // 2. Generate AI completion with context memory
    const aiResult = await aiService.generateChatCompletion(history, cleanMessage);

    // 3. Persist exchange and AI usage in Postgres transaction
    await conversationService.saveExchange(
      user.id,
      conversation.id,
      cleanMessage,
      aiResult.reply,
      aiResult.model,
      aiResult.tokensUsed
    );

    return res.status(200).json({
      status: 'success',
      reply: aiResult.reply,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  handleChat,
};
