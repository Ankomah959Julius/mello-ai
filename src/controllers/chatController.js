import aiService from '../services/aiService.js';

export const handleChat = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required and must be a non-empty string.',
      });
    }

    const reply = await aiService.generateChatCompletion(message.trim());

    return res.status(200).json({
      status: 'success',
      reply,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  handleChat,
};
