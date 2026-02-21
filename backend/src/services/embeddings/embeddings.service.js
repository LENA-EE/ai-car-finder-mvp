/**
 * Embeddings Service
 *
 * Uses OpenAI text-embedding-3-small (1536 dimensions) via OpenRouter
 * for generating vector embeddings for semantic search.
 *
 * Uses the same OPENROUTER_API_KEY as other agents.
 */

const OpenAI = require('openai');

const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// OpenRouter client for embeddings
let openrouterClient = null;

function getOpenRouterClient() {
  if (!openrouterClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not set');
    }
    openrouterClient = new OpenAI({
      apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
    });
  }
  return openrouterClient;
}

/**
 * Generate embedding for a single text
 * @param {string} text - Text to embed
 * @returns {Promise<{embedding: number[], tokens: number}>}
 */
async function generateEmbedding(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Text is required for embedding generation');
  }

  const client = getOpenRouterClient();

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.trim(),
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return {
    embedding: response.data[0].embedding,
    tokens: response.usage.total_tokens,
  };
}

/**
 * Generate embeddings for multiple texts in batch
 * @param {string[]} texts - Array of texts to embed
 * @returns {Promise<{embeddings: number[][], tokens: number}>}
 */
async function generateEmbeddingsBatch(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('Array of texts is required');
  }

  // Filter out empty strings
  const validTexts = texts.filter(t => t && typeof t === 'string' && t.trim());
  if (validTexts.length === 0) {
    throw new Error('No valid texts provided');
  }

  const client = getOpenRouterClient();

  // OpenRouter batch limit (same as OpenAI: 2048 texts per request)
  const BATCH_SIZE = 2048;
  const allEmbeddings = [];
  let totalTokens = 0;

  for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
    const batch = validTexts.slice(i, i + BATCH_SIZE);

    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch.map(t => t.trim()),
      dimensions: EMBEDDING_DIMENSIONS,
    });

    // Sort by index to maintain order
    const sorted = response.data.sort((a, b) => a.index - b.index);
    allEmbeddings.push(...sorted.map(d => d.embedding));
    totalTokens += response.usage.total_tokens;
  }

  return {
    embeddings: allEmbeddings,
    tokens: totalTokens,
  };
}

/**
 * Calculate estimated cost for embedding tokens
 * text-embedding-3-small: $0.00002 per 1K tokens
 */
function estimateCost(tokens) {
  return (tokens / 1000) * 0.00002;
}

/**
 * Check if embeddings are available
 */
function isAvailable() {
  return !!process.env.OPENROUTER_API_KEY;
}

module.exports = {
  generateEmbedding,
  generateEmbeddingsBatch,
  estimateCost,
  isAvailable,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
};
