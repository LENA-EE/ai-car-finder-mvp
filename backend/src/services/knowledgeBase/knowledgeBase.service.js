const kbRepo = require('../../repositories/knowledgeBase.repository');
const { generateEmbedding, generateEmbeddingsBatch, isAvailable: isEmbeddingsAvailable, estimateCost } = require('../embeddings/embeddings.service');

async function addArticle(title, description, content) {
  const article = await kbRepo.insertArticle(title, description, content);

  // Auto-generate embedding if available
  if (isEmbeddingsAvailable()) {
    try {
      const textForEmbedding = buildKbText(title, description, content);
      const { embedding } = await generateEmbedding(textForEmbedding);
      await kbRepo.updateEmbedding(article.id, embedding);
      console.log(`[KnowledgeBase] Embedding generated for article #${article.id}`);
    } catch (err) {
      console.warn(`[KnowledgeBase] Failed to generate embedding for article #${article.id}:`, err.message);
    }
  }

  return article;
}

async function listArticles() {
  return kbRepo.getAllArticles();
}

async function deleteArticle(id) {
  return kbRepo.deleteArticle(id);
}

async function getArticle(id) {
  return kbRepo.getArticleById(id);
}

async function updateArticle(id, title, description, content) {
  const article = await kbRepo.updateArticle(id, title, description, content);
  if (!article) return null;

  // Auto-generate embedding (same pattern as addArticle)
  if (isEmbeddingsAvailable()) {
    try {
      const textForEmbedding = buildKbText(title, description, content);
      const { embedding } = await generateEmbedding(textForEmbedding);
      await kbRepo.updateEmbedding(article.id, embedding);
      console.log(`[KnowledgeBase] Embedding regenerated for article #${article.id}`);
    } catch (err) {
      console.warn(`[KnowledgeBase] Failed to regenerate embedding for article #${article.id}:`, err.message);
    }
  }

  return article;
}

async function searchKnowledge(query, limit = 5) {
  if (!isEmbeddingsAvailable()) {
    return [];
  }

  const { embedding } = await generateEmbedding(query);
  return kbRepo.searchBySimiliarity(embedding, limit, 0.25);
}

async function generateMissingEmbeddings() {
  if (!isEmbeddingsAvailable()) {
    throw { code: 'EMBEDDINGS_UNAVAILABLE', message: 'OPENROUTER_API_KEY is not set' };
  }

  const articles = await kbRepo.getArticlesWithoutEmbeddings();
  if (articles.length === 0) {
    return { processed: 0, totalTokens: 0, costUsd: 0 };
  }

  const texts = articles.map(a => buildKbText(a.title, a.description, a.content));
  const { embeddings, tokens } = await generateEmbeddingsBatch(texts);

  const updates = articles.map((a, i) => ({
    id: a.id,
    embedding: embeddings[i],
  }));
  await kbRepo.batchUpdateEmbeddings(updates);

  console.log(`[KnowledgeBase] Generated embeddings for ${articles.length} articles (${tokens} tokens)`);

  return {
    processed: articles.length,
    totalTokens: tokens,
    costUsd: estimateCost(tokens),
  };
}

async function getStats() {
  return kbRepo.getStats();
}

function buildKbText(title, description, content) {
  const parts = [title];
  if (description) parts.push(description);
  parts.push(content);
  return parts.join('. ');
}

module.exports = {
  addArticle,
  getArticle,
  updateArticle,
  listArticles,
  deleteArticle,
  searchKnowledge,
  generateMissingEmbeddings,
  getStats,
};
