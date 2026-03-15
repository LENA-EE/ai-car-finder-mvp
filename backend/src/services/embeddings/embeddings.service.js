/**
 * Embeddings Service
 *
 * Uses OpenAI text-embedding-3-small (1536 dimensions) via OpenRouter
 * for generating vector embeddings for semantic search.
 *
 * Uses the same OPENROUTER_API_KEY as other agents.
 */

const OpenAI = require('openai');

// Embeddings: OpenRouter (приоритет) → OpenAI direct (запасной)
const EMBEDDING_DIMENSIONS = 1536;
let embeddingsClient = null;
let embeddingModel = null;

function getEmbeddingsClient() {
  if (!embeddingsClient) {
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (openrouterKey) {
      embeddingsClient = new OpenAI({ apiKey: openrouterKey, baseURL: 'https://openrouter.ai/api/v1' });
      embeddingModel = 'openai/text-embedding-3-small';
    } else if (openaiKey) {
      embeddingsClient = new OpenAI({ apiKey: openaiKey });
      embeddingModel = 'text-embedding-3-small';
    } else {
      throw new Error('No API key for embeddings (OPENROUTER_API_KEY or OPENAI_API_KEY)');
    }
  }
  return embeddingsClient;
}

function getEmbeddingModel() {
  if (!embeddingModel) getEmbeddingsClient();
  return embeddingModel;
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

  const client = getEmbeddingsClient();

  const response = await client.embeddings.create({
    model: getEmbeddingModel(),
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

  const client = getEmbeddingsClient();

  // OpenRouter batch limit (same as OpenAI: 2048 texts per request)
  const BATCH_SIZE = 2048;
  const allEmbeddings = [];
  let totalTokens = 0;

  for (let i = 0; i < validTexts.length; i += BATCH_SIZE) {
    const batch = validTexts.slice(i, i + BATCH_SIZE);

    const response = await client.embeddings.create({
      model: getEmbeddingModel(),
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
  return !!(process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY);
}

module.exports = {
  generateEmbedding,
  generateEmbeddingsBatch,
  estimateCost,
  isAvailable,
  getEmbeddingModel,
  EMBEDDING_DIMENSIONS,
};
