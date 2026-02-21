-- Migration: Add pgvector support for semantic search
-- Run this migration in Neon SQL Editor

-- Enable pgvector extension (Neon has it pre-installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to cars_catalog
ALTER TABLE cars_catalog
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create HNSW index for fast cosine similarity search
-- HNSW is faster than IVFFlat for high-recall searches
CREATE INDEX IF NOT EXISTS idx_cars_embedding_hnsw
ON cars_catalog
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Add index for cars without embeddings (for batch processing)
CREATE INDEX IF NOT EXISTS idx_cars_embedding_null
ON cars_catalog (id)
WHERE embedding IS NULL;

-- Verify migration
SELECT
    (SELECT COUNT(*) FROM cars_catalog) as total_cars,
    (SELECT COUNT(*) FROM cars_catalog WHERE embedding IS NOT NULL) as cars_with_embeddings;
