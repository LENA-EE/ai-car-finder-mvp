const { authenticateToken, requireAdmin } = require('./auth');
const { errorHandler } = require('./errorHandler');

module.exports = {
  authenticateToken,
  requireAdmin,
  errorHandler,
};
