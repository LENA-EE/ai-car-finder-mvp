-- Migration: Add knowledge_base table for RAG articles
-- Run this migration in Neon SQL Editor

CREATE TABLE IF NOT EXISTS knowledge_base (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  description VARCHAR(1000),
  content TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_kb_embedding_hnsw
ON knowledge_base
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Index for articles without embeddings (for batch processing)
CREATE INDEX IF NOT EXISTS idx_kb_embedding_null
ON knowledge_base (id)
WHERE embedding IS NULL;

-- Verify migration
SELECT COUNT(*) as knowledge_base_articles FROM knowledge_base;
