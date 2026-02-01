const { getAuditLog } = require('../repositories/audit.repository');

async function audit(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const logs = await getAuditLog(limit);
    res.json(logs);
  } catch (err) {
    console.error('Audit log error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

module.exports = { audit };
