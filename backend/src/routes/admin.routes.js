const express = require('express');
const router = express.Router();
const { adminRateLimiter } = require('../config/rateLimiter');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const analyticsController = require('../controllers/analytics.controller');
const promptsController = require('../controllers/prompts.controller');
const auditController = require('../controllers/audit.controller');

router.get('/analytics', adminRateLimiter, authenticateToken, analyticsController.analytics);
router.get('/prompts', adminRateLimiter, authenticateToken, promptsController.getPrompts);
router.post('/prompts', adminRateLimiter, authenticateToken, requireAdmin, promptsController.updatePrompts);
router.get('/audit', adminRateLimiter, authenticateToken, requireAdmin, auditController.audit);

module.exports = router;
