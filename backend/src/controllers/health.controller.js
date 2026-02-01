const { pool } = require('../config/database');
const config = require('../config');

async function health(req, res) {
  try {
    const result = await pool.query('SELECT COUNT(*) as total FROM cars_catalog');
    res.json({
      status: 'healthy',
      database: 'connected',
      llm_enabled: config.llmEnabled,
      catalog_status: 'loaded',
      catalog_size: parseInt(result.rows[0].total)
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      llm_enabled: config.llmEnabled,
      error: err.message
    });
  }
}

module.exports = { health };
