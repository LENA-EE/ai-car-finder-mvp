const { openai } = require('../../config/openai');
const { FEW_SHOT_EXAMPLES } = require('../../constants/fewShotExamples');
const { getPromptConfig } = require('../config/prompts.service');

// Only these filter fields are valid (exist in DB)
const VALID_FILTER_FIELDS = new Set([
  'mark_name',
  'folder_name',
  'body_type',
  'engine_volume_min',
  'engine_volume_max',
  'engine_type',
  'min_hp',
  'max_hp',
  'transmission',
  'drive_type',
  'year_from',
  'year_to',
  'price_min',
  'price_max'
]);

function sanitizeFilters(filters) {
  const sanitized = {};
  for (const [key, value] of Object.entries(filters)) {
    if (VALID_FILTER_FIELDS.has(key) && value !== null && value !== undefined && value !== '') {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

async function llmParse(query) {
  const promptConfig = getPromptConfig();

  const fewShotMessages = FEW_SHOT_EXAMPLES.flatMap(ex => [
    { role: 'user', content: ex.input },
    { role: 'assistant', content: JSON.stringify(ex.output) }
  ]);

  const messages = [
    { role: 'system', content: promptConfig.system_prompt },
    ...fewShotMessages,
    { role: 'user', content: query }
  ];

  const response = await openai.chat.completions.create({
    model: 'deepseek/deepseek-chat',
    messages,
    temperature: promptConfig.temperature,
    max_tokens: promptConfig.max_tokens,
    response_format: { type: 'json_object' }
  });

  // Safely extract content
  const content = response?.choices?.[0]?.message?.content;
  if (!content) {
    console.error('[LLM Parser] Empty response from LLM');
    return { filters: null, costUsd: 0 };
  }

  // Safely parse JSON
  let rawFilters;
  try {
    rawFilters = JSON.parse(content);
  } catch (parseErr) {
    console.error(`[LLM Parser] Invalid JSON from LLM: ${content}`);
    return { filters: null, costUsd: 0 };
  }

  const filters = sanitizeFilters(rawFilters);

  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;
  const costUsd = (inputTokens * 0.00000014) + (outputTokens * 0.00000028);

  // Log if LLM returned invalid fields
  const invalidFields = Object.keys(rawFilters).filter(k => !VALID_FILTER_FIELDS.has(k));
  if (invalidFields.length > 0) {
    console.log(`LLM returned invalid fields (ignored): ${invalidFields.join(', ')}`);
  }

  return {
    filters: Object.keys(filters).length > 0 ? filters : null,
    costUsd: Math.round(costUsd * 100000000) / 100000000
  };
}

module.exports = { llmParse };
