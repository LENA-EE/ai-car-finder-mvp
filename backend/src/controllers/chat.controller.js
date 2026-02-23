/**
 * Chat Controller
 *
 * Handles conversational AI requests
 */

const chatService = require('../services/chat/chat.service');

/**
 * POST /api/v1/chat
 * Process chat message
 */
async function chat(req, res) {
  try {
    const { message, history, mode = 'friendly' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'MESSAGE_REQUIRED',
        message: 'Сообщение обязательно',
      });
    }

    const result = await chatService.processMessage(message, history, mode);

    res.json(result);
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({
      error: 'CHAT_ERROR',
      message: 'Ошибка обработки сообщения',
    });
  }
}

module.exports = {
  chat,
};
