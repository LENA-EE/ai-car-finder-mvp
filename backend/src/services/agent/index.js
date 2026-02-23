/**
 * AI Agent with Tool Use
 *
 * Агент который сам решает какие инструменты вызывать.
 * Использует DeepSeek с function calling.
 */

const { openai } = require('../../config/openai');
const { TOOLS } = require('./tools');
const { executeTool } = require('./executor');

const MAX_ITERATIONS = 5; // Защита от бесконечного цикла

/**
 * Системный промпт для агента
 */
function getSystemPrompt(mode = 'friendly') {
  const basePrompt = `Ты AI-помощник по подбору автомобилей. У тебя есть инструменты для:
- Поиска машин в каталоге
- Проверки VIN по базам (залоги, ДТП)
- Расшифровки VIN
- Советов по моделям

ПРАВИЛА:
1. Используй инструменты когда нужна реальная информация (поиск, проверка VIN)
2. Для советов и сравнений можешь использовать свои знания
3. Если пользователь здоровается — просто поздоровайся
4. Понимай русский сленг: бумер=BMW, мерс=Mercedes, тойота=Toyota, до 2 млн=price_max:2000000
5. Если запрос непонятен — уточни

СЛЕНГ ЦЕН:
- "до 700к" = price_max: 700000
- "до 1.5 млн" = price_max: 1500000
- "до 2 миллионов" = price_max: 2000000

СЛЕНГ МАРОК:
- бумер, бэха = BMW
- мерс, мерин = Mercedes-Benz
- тойота = Toyota
- ауди = Audi`;

  if (mode === 'friendly') {
    return basePrompt + `

СТИЛЬ ОБЩЕНИЯ:
- Дружелюбный и живой
- Используй эмодзи умеренно
- Шути когда уместно
- Будь как друг который разбирается в машинах`;
  }

  return basePrompt + `

СТИЛЬ ОБЩЕНИЯ:
- Кратко и по делу
- Без лишних слов
- Только факты`;
}

/**
 * Обработать сообщение через агента с Tool Use
 */
async function processWithAgent(message, history = [], mode = 'friendly') {
  // Формируем историю сообщений
  const messages = [
    { role: 'system', content: getSystemPrompt(mode) },
    ...history.slice(-10).map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: message },
  ];

  let iterations = 0;
  let toolResults = [];

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    try {
      // Вызываем LLM с инструментами
      const response = await openai.chat.completions.create({
        model: 'deepseek/deepseek-chat',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 1000,
      });

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      // Если LLM хочет вызвать инструменты
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Добавляем ответ ассистента в историю
        messages.push(assistantMessage);

        // Выполняем каждый инструмент
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          let toolArgs = {};

          try {
            toolArgs = JSON.parse(toolCall.function.arguments);
          } catch (e) {
            console.error('Failed to parse tool arguments:', toolCall.function.arguments);
          }

          // Выполняем инструмент
          const result = await executeTool(toolName, toolArgs);
          toolResults.push({ tool: toolName, args: toolArgs, result });

          // Добавляем результат в историю
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        }

        // Продолжаем цикл — LLM сформирует ответ на основе результатов
        continue;
      }

      // LLM дал финальный ответ (без вызова инструментов)
      const content = assistantMessage.content || '';

      // Извлекаем машины из результатов инструментов (для отображения карточек)
      let cars = null;
      let vinResult = null;

      for (const tr of toolResults) {
        if (tr.tool === 'search_cars' && tr.result.success && tr.result.cars) {
          cars = tr.result.cars;
        }
        if (tr.tool === 'semantic_search' && tr.result.success && tr.result.cars) {
          cars = tr.result.cars;
        }
        if ((tr.tool === 'check_vin' || tr.tool === 'decode_vin') && tr.result.success) {
          vinResult = tr.result;
        }
      }

      return {
        message: content,
        cars,
        vinResult,
        toolsUsed: toolResults.map(tr => tr.tool),
      };

    } catch (err) {
      console.error('[Agent] Error:', err);
      return {
        message: `Произошла ошибка: ${err.message}`,
        cars: null,
        vinResult: null,
      };
    }
  }

  // Достигнут лимит итераций
  return {
    message: 'Слишком сложный запрос, попробуй переформулировать.',
    cars: null,
    vinResult: null,
  };
}

module.exports = { processWithAgent };
