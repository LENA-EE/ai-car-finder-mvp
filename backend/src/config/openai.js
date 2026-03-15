const OpenAI = require('openai');

// Всё через OpenRouter (LLM + embeddings)
const apiKey = process.env.OPENROUTER_API_KEY;
const baseURL = 'https://openrouter.ai/api/v1';
const LLM_MODEL = 'deepseek/deepseek-chat';

const openai = new OpenAI({ apiKey, baseURL });

module.exports = { openai, LLM_MODEL };
