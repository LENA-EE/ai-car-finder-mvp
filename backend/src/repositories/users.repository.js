const { pool } = require('../config/database');

async function findUserByEmail(email) {
  const result = await pool.query(
    'SELECT id, email, password_hash, role FROM admin_users WHERE email = $1',
    [email]
  );
  return result.rows[0] || null;
}

async function updateLastLogin(userId) {
  await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [userId]);
}

module.exports = {
  findUserByEmail,
  updateLastLogin,
};
