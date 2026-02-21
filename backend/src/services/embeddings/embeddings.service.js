/**
 * Embeddings Service
 *
 * Uses OpenAI text-embedding-3-small (1536 dimensions)
 * for generating vector embeddings for semantic search.
 *
 * Note: Uses OPENAI_API_KEY (direct OpenAI), not OPENROUTER_API_KEY
 */

const OpenAI = require('openai');

const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;

// OpenAI client for embeddings (direct API, not OpenRouter)
let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
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

  const client = getOpenAIClient();

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

  const client = getOpenAIClient();

  // OpenAI batch limit is 2048 texts per request
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
  return !!process.env.OPENAI_API_KEY;
}

module.exports = {
  generateEmbedding,
  generateEmbeddingsBatch,
  estimateCost,
  isAvailable,
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
};
