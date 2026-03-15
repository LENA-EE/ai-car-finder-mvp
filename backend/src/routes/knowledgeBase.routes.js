const express = require('express');
const router = express.Router();
const { adminRateLimiter } = require('../config/rateLimiter');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const kbController = require('../controllers/knowledgeBase.controller');

router.get('/', adminRateLimiter, authenticateToken, requireAdmin, kbController.list);
router.post('/', adminRateLimiter, authenticateToken, requireAdmin, kbController.add);
router.delete('/:id', adminRateLimiter, authenticateToken, requireAdmin, kbController.remove);
router.get('/stats', adminRateLimiter, authenticateToken, requireAdmin, kbController.stats);
router.post('/embeddings', adminRateLimiter, authenticateToken, requireAdmin, kbController.generateEmbeddings);
router.get('/:id', adminRateLimiter, authenticateToken, requireAdmin, kbController.getOne);
router.put('/:id', adminRateLimiter, authenticateToken, requireAdmin, kbController.update);

module.exports = router;
