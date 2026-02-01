const { pool } = require('../config/database');

async function logAdminAction(adminId, adminEmail, actionType, payload, req) {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, admin_email, action_type, payload, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, adminEmail, actionType, JSON.stringify(payload), ip, userAgent]
    );
  } catch (err) {
    console.error('Failed to log admin action:', err.message);
  }
}

async function getAuditLog(limit) {
  const result = await pool.query(
    `SELECT id, admin_email, action_type, payload, ip_address, created_at
     FROM admin_audit_log
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

module.exports = {
  logAdminAction,
  getAuditLog,
};
