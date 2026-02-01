const { pool } = require('../config/database');

async function logParseSession(query, filters, method, latencyMs, costUsd, resultsCount) {
  try {
    await pool.query(
      `INSERT INTO parse_sessions (user_query, filters, parsing_method, latency_ms, cost_usd, catalog_status, results_count)
       VALUES ($1, $2, $3, $4, $5, 'loaded', $6)`,
      [query, JSON.stringify(filters), method, latencyMs, costUsd, resultsCount]
    );
  } catch (err) {
    console.error('Failed to log parse session:', err.message);
  }
}

async function getTodayStats() {
  return pool.query(`
    SELECT
      COUNT(*) as requests,
      COUNT(*) FILTER (WHERE filters IS NOT NULL) as successful_parses,
      COALESCE(SUM(cost_usd), 0) as total_cost
    FROM parse_sessions
    WHERE created_at >= CURRENT_DATE
  `);
}

async function getMethodStats() {
  return pool.query(`
    SELECT parsing_method, COUNT(*) as count
    FROM parse_sessions
    WHERE created_at >= CURRENT_DATE
    GROUP BY parsing_method
  `);
}

async function getTopBrands() {
  return pool.query(`
    SELECT filters->>'mark_name' as name, COUNT(*) as count
    FROM parse_sessions
    WHERE created_at >= CURRENT_DATE AND filters->>'mark_name' IS NOT NULL
    GROUP BY filters->>'mark_name'
    ORDER BY count DESC
    LIMIT 5
  `);
}

module.exports = {
  logParseSession,
  getTodayStats,
  getMethodStats,
  getTopBrands,
};
