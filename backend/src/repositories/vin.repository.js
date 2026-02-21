/**
 * VIN Repository
 *
 * Handles caching of VIN check results in PostgreSQL.
 */

const { pool } = require('../config/database');

/**
 * Get cached VIN check result
 * @param {string} vin - VIN number
 * @returns {Promise<Object|null>} Cached result or null
 */
async function getCachedCheck(vin) {
  const result = await pool.query(`
    SELECT id, vin, result, status, checked_at, expires_at
    FROM vin_checks
    WHERE vin = $1 AND expires_at > NOW()
    ORDER BY checked_at DESC
    LIMIT 1
  `, [vin.toUpperCase()]);

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    vin: row.vin,
    result: row.result,
    status: row.status,
    checkedAt: row.checked_at,
    expiresAt: row.expires_at,
    cached: true,
  };
}

/**
 * Save VIN check result to cache
 * @param {string} vin - VIN number
 * @param {Object} result - Check result
 * @param {string} status - ok | warning | danger
 * @param {number} ttlSeconds - Cache TTL in seconds (default 24h)
 */
async function saveCheck(vin, result, status = 'ok', ttlSeconds = 86400) {
  await pool.query(`
    INSERT INTO vin_checks (vin, result, status, expires_at)
    VALUES ($1, $2, $3, NOW() + INTERVAL '${ttlSeconds} seconds')
  `, [vin.toUpperCase(), JSON.stringify(result), status]);
}

/**
 * Get WMI data (manufacturer info)
 * @param {string} wmi - First 3 chars of VIN
 * @returns {Promise<Object|null>}
 */
async function getWmiData(wmi) {
  const upperWmi = wmi.toUpperCase();

  // Try exact 3-char match first
  let result = await pool.query(`
    SELECT wmi, manufacturer, country, region
    FROM vin_wmi
    WHERE wmi = $1
  `, [upperWmi]);

  if (result.rows[0]) {
    return result.rows[0];
  }

  // Fallback to 2-char prefix (many WMI entries use 2 chars)
  result = await pool.query(`
    SELECT wmi, manufacturer, country, region
    FROM vin_wmi
    WHERE wmi = $1
  `, [upperWmi.substring(0, 2)]);

  return result.rows[0] || null;
}

/**
 * Get all WMI data for a prefix (first 1-2 chars)
 * @param {string} prefix
 */
async function getWmiByPrefix(prefix) {
  const result = await pool.query(`
    SELECT wmi, manufacturer, country, region
    FROM vin_wmi
    WHERE wmi LIKE $1
  `, [prefix.toUpperCase() + '%']);

  return result.rows;
}

/**
 * Clean expired cache entries
 */
async function cleanExpiredCache() {
  const result = await pool.query(`
    DELETE FROM vin_checks
    WHERE expires_at < NOW()
  `);
  return result.rowCount;
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  const result = await pool.query(`
    SELECT
      COUNT(*) as total_checks,
      COUNT(*) FILTER (WHERE expires_at > NOW()) as active_cache,
      COUNT(*) FILTER (WHERE status = 'danger') as danger_count,
      COUNT(*) FILTER (WHERE status = 'warning') as warning_count
    FROM vin_checks
  `);
  return result.rows[0];
}

module.exports = {
  getCachedCheck,
  saveCheck,
  getWmiData,
  getWmiByPrefix,
  cleanExpiredCache,
  getCacheStats,
};
