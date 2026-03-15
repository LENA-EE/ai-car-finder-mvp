require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const config = require('./config');
const routes = require('./routes');
const { errorHandler } = require('./middleware');
const { pool } = require('./config/database');
const { loadSynonyms } = require('./services/config/synonyms.service');
const { loadPromptConfig } = require('./services/config/prompts.service');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use(routes);

// Health check at root level (also available via /api/v1/health)
app.get('/health', require('./controllers/health.controller').health);

// Error handler
app.use(errorHandler);

// Run database migrations
async function runMigrations() {
  try {
    // Add UNIQUE constraint to prompt_versions.version if not exists
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'prompt_versions_version_unique'
        ) THEN
          ALTER TABLE prompt_versions ADD CONSTRAINT prompt_versions_version_unique UNIQUE (version);
          RAISE NOTICE 'Added UNIQUE constraint to prompt_versions.version';
        END IF;
      END $$;
    `);
    // Knowledge base table for RAG articles
    await pool.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description VARCHAR(1000),
        content TEXT NOT NULL,
        embedding vector(1536),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kb_embedding_hnsw ON knowledge_base USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kb_embedding_null ON knowledge_base (id) WHERE embedding IS NULL;`);

    console.log('Migrations checked');
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

// Init function
async function init() {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected');
    await runMigrations();
    await loadSynonyms();
    await loadPromptConfig();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.log('Running without database (mock mode)');
  }

  if (config.llmEnabled) {
    console.log('LLM enabled via OpenRouter (DeepSeek)');
  } else {
    console.log('LLM disabled (no OPENROUTER_API_KEY), using keyword parser');
  }

  console.log('JWT authentication enabled');
}

// Start server
const PORT = config.port;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Backend: http://localhost:${PORT}`);
  console.log(`Parse:   POST http://localhost:${PORT}/api/v1/parse`);
  console.log(`Login:   POST http://localhost:${PORT}/api/v1/admin/auth/login`);
  console.log(`Admin:   GET  http://localhost:${PORT}/api/v1/admin/analytics (JWT)`);
  await init();
});
