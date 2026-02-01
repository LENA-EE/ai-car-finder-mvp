const { getAnalytics } = require('../services/analytics/analytics.service');

async function analytics(req, res) {
  try {
    const data = await getAnalytics();
    res.json(data);
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
}

module.exports = { analytics };
