/**
 * Semantic Search Service
 *
 * Provides vector-based semantic search for car queries.
 * Uses pgvector for similarity search and OpenAI embeddings.
 */

const carsRepo = require('../../repositories/cars.repository');
const kbRepo = require('../../repositories/knowledgeBase.repository');
const { generateEmbedding, isAvailable: isEmbeddingsAvailable } = require('../embeddings/embeddings.service');

/**
 * Search cars by semantic similarity
 * @param {string} query - Natural language query
 * @param {Object} options - Search options
 * @returns {Promise<{items: Array, total: number, queryType: string}>}
 */
async function semanticSearch(query, options = {}) {
  const { limit = 10, threshold = 0.3 } = options;

  if (!isEmbeddingsAvailable()) {
    console.warn('[SemanticSearch] Embeddings not available (no OPENAI_API_KEY)');
    return { items: [], total: 0, queryType: 'semantic', error: 'Embeddings not available' };
  }

  try {
    // One embedding, search both cars + knowledge base in parallel
    const { embedding, tokens } = await generateEmbedding(query);

    const [carResults, kbResults] = await Promise.all([
      carsRepo.searchCarsBySimilarity(embedding, limit, threshold),
      kbRepo.searchBySimiliarity(embedding, 3, threshold).catch(() => []),
    ]);

    console.log(`[SemanticSearch] Cars: ${carResults.length}, KB: ${kbResults.length} for "${query.substring(0, 50)}" (${tokens} tokens)`);

    return {
      items: carResults,
      total: carResults.length,
      queryType: 'semantic',
      knowledge: kbResults,
      metrics: {
        embeddingTokens: tokens,
      },
    };
  } catch (err) {
    console.error('[SemanticSearch] Error:', err.message);
    throw err;
  }
}

/**
 * Hybrid search: combines semantic similarity with SQL filters
 * @param {string} query - Natural language query
 * @param {Object} filters - Extracted filters (brand, price, etc.)
 * @param {Object} options - Search options
 */
async function hybridSearch(query, filters, options = {}) {
  const { limit = 10, threshold = 0.3 } = options;

  if (!isEmbeddingsAvailable()) {
    console.warn('[HybridSearch] Embeddings not available, falling back to filters only');
    const filterResults = await carsRepo.searchCars(filters, limit, 0);
    return {
      items: filterResults.items,
      total: filterResults.total,
      queryType: 'hybrid_fallback',
    };
  }

  try {
    // Generate embedding for query
    const { embedding, tokens } = await generateEmbedding(query);

    // Hybrid search: vector + filters
    const results = await carsRepo.searchCarsHybrid(embedding, filters, limit, threshold);

    console.log(`[HybridSearch] Found ${results.length} results for "${query.substring(0, 50)}" with filters ${JSON.stringify(filters)}`);

    return {
      items: results,
      total: results.length,
      queryType: 'hybrid',
      metrics: {
        embeddingTokens: tokens,
        filtersApplied: Object.keys(filters).length,
      },
    };
  } catch (err) {
    console.error('[HybridSearch] Error:', err.message);
    // Fallback to filter-only search
    console.log('[HybridSearch] Falling back to filter-only search');
    const filterResults = await carsRepo.searchCars(filters, limit, 0);
    return {
      items: filterResults.items,
      total: filterResults.total,
      queryType: 'hybrid_fallback',
      error: err.message,
    };
  }
}

/**
 * Check if semantic search is available
 */
function isSemanticSearchAvailable() {
  return isEmbeddingsAvailable();
}

/**
 * Get embedding statistics
 */
async function getEmbeddingStats() {
  return carsRepo.getEmbeddingStats();
}

module.exports = {
  semanticSearch,
  hybridSearch,
  isSemanticSearchAvailable,
  getEmbeddingStats,
};
