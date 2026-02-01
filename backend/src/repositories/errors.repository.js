const { pool } = require('../config/database');

async function logErrorToGraveyard(query, errorType) {
  try {
    const pattern = query.toLowerCase().trim();
    await pool.query(
      `INSERT INTO error_graveyard (error_type, query_pattern, frequency, last_seen)
       VALUES ($1, $2, 1, NOW())
       ON CONFLICT (error_type, query_pattern)
       DO UPDATE SET frequency = error_graveyard.frequency + 1, last_seen = NOW()`,
      [errorType, pattern]
    );
  } catch (err) {
    console.error('Failed to log error to graveyard:', err.message);
  }
}

async function getErrors(showResolved, limit) {
  return pool.query(
    `SELECT id, error_type, query_pattern, frequency, last_seen, resolved, resolution_note
     FROM error_graveyard
     WHERE resolved = $1
     ORDER BY frequency DESC, last_seen DESC
     LIMIT $2`,
    [showResolved, limit]
  );
}

async function getErrorStats() {
  return pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE NOT resolved) as unresolved_count,
      COUNT(*) FILTER (WHERE resolved) as resolved_count,
      SUM(frequency) FILTER (WHERE NOT resolved) as total_occurrences,
      COUNT(DISTINCT error_type) FILTER (WHERE NOT resolved) as error_types
    FROM error_graveyard
  `);
}

async function resolveError(id, note) {
  return pool.query(
    `UPDATE error_graveyard
     SET resolved = true, resolution_note = $1
     WHERE id = $2
     RETURNING id, error_type, query_pattern, resolved`,
    [note || 'Resolved', id]
  );
}

async function deleteError(id) {
  return pool.query(
    `DELETE FROM error_graveyard WHERE id = $1 RETURNING id, query_pattern`,
    [id]
  );
}

module.exports = {
  logErrorToGraveyard,
  getErrors,
  getErrorStats,
  resolveError,
  deleteError,
};
