/**
 * Chat Service
 *
 * Использует AI Agent с Tool Use для обработки сообщений.
 * Агент сам решает какие инструменты вызывать.
 */

const { processWithAgent } = require('../agent');
const config = require('../../config');

// Флаг использования агента (можно выключить для отладки)
const USE_AGENT = config.llmEnabled;

/**
 * Process chat message
 * @param {string} message - User message
 * @param {Array} history - Previous messages for context
 * @param {string} mode - Chat mode: "quick" or "friendly"
 * @returns {Promise<Object>}
 */
async function processMessage(message, history = [], mode = 'friendly') {
  // Используем AI агента с Tool Use
  if (USE_AGENT) {
    try {
      const result = await processWithAgent(message, history, mode);

      // Генерируем подсказки на основе результата
      const suggestions = generateSuggestions(result, mode);

      return {
        message: result.message,
        cars: result.cars,
        vinResult: result.vinResult,
        suggestions,
        toolsUsed: result.toolsUsed, // для отладки
      };
    } catch (err) {
      console.error('[Chat] Agent error:', err);
      // Fallback на простой ответ
      return {
        message: mode === 'quick'
          ? 'Ошибка обработки. Попробуй ещё раз.'
          : 'Упс, что-то пошло не так 😕 Попробуй переформулировать запрос!',
        suggestions: ['Кроссовер до 2 млн', 'Проверить VIN', 'Помощь'],
      };
    }
  }

  // Fallback без LLM
  return {
    message: 'AI агент отключён. Включи LLM в настройках.',
    suggestions: ['Помощь'],
  };
}

/**
 * Генерация подсказок на основе результата
 */
function generateSuggestions(result, mode) {
  const suggestions = [];

  // Если были найдены машины
  if (result.cars && result.cars.length > 0) {
    if (result.cars.length >= 5) {
      suggestions.push('Показать ещё');
    }
    suggestions.push('Только автомат');
    suggestions.push('Только дизель');
  }
  // Если была проверка VIN
  else if (result.vinResult) {
    suggestions.push('Проверить другой VIN');
    suggestions.push('Найти похожие машины');
  }
  // Общие подсказки
  else {
    suggestions.push('Кроссовер до 2 млн');
    suggestions.push('Надёжная семейная машина');
    suggestions.push('Проверить VIN');
  }

  return suggestions.slice(0, 3);
}

module.exports = {
  processMessage,
};
