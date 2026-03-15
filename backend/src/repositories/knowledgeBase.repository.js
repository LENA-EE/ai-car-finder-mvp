const { pool } = require('../config/database');

async function getAllArticles() {
  const { rows } = await pool.query(
    `SELECT id, title, description,
            LENGTH(content) as content_length,
            embedding IS NOT NULL as has_embedding,
            created_at, updated_at
     FROM knowledge_base
     ORDER BY created_at DESC`
  );
  return rows;
}

async function getArticleById(id) {
  const { rows } = await pool.query(
    `SELECT * FROM knowledge_base WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function insertArticle(title, description, content) {
  const { rows } = await pool.query(
    `INSERT INTO knowledge_base (title, description, content)
     VALUES ($1, $2, $3)
     RETURNING id, title, description, created_at`,
    [title, description || null, content]
  );
  return rows[0];
}

async function deleteArticle(id) {
  const { rows } = await pool.query(
    `DELETE FROM knowledge_base WHERE id = $1 RETURNING id, title`,
    [id]
  );
  return rows[0] || null;
}

async function getArticlesWithoutEmbeddings(limit = 100) {
  const { rows } = await pool.query(
    `SELECT id, title, description, content
     FROM knowledge_base
     WHERE embedding IS NULL
     ORDER BY id
     LIMIT $1`,
    [limit]
  );
  return rows;
}

async function updateEmbedding(id, embedding) {
  await pool.query(
    `UPDATE knowledge_base
     SET embedding = $1, updated_at = NOW()
     WHERE id = $2`,
    [`[${embedding.join(',')}]`, id]
  );
}

async function batchUpdateEmbeddings(updates) {
  for (const { id, embedding } of updates) {
    await updateEmbedding(id, embedding);
  }
}

async function searchBySimiliarity(embedding, limit = 5, threshold = 0.3) {
  const vectorStr = `[${embedding.join(',')}]`;
  const { rows } = await pool.query(
    `SELECT id, title, description, content,
            1 - (embedding <=> $1::vector) as similarity
     FROM knowledge_base
     WHERE embedding IS NOT NULL
       AND 1 - (embedding <=> $1::vector) >= $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [vectorStr, threshold, limit]
  );
  return rows;
}

async function updateArticle(id, title, description, content) {
  const { rows } = await pool.query(
    `UPDATE knowledge_base
     SET title = $1, description = $2, content = $3, embedding = NULL, updated_at = NOW()
     WHERE id = $4
     RETURNING id, title, description, created_at, updated_at`,
    [title, description || null, content, id]
  );
  return rows[0] || null;
}

async function getStats() {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) as total_articles,
      COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
      COUNT(*) FILTER (WHERE embedding IS NULL) as without_embeddings
    FROM knowledge_base
  `);
  return rows[0];
}

module.exports = {
  getAllArticles,
  getArticleById,
  insertArticle,
  deleteArticle,
  getArticlesWithoutEmbeddings,
  updateEmbedding,
  batchUpdateEmbeddings,
  updateArticle,
  searchBySimiliarity,
  getStats,
};
