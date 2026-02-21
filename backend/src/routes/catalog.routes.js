const express = require('express');
const router = express.Router();
const { adminRateLimiter, uploadRateLimiter } = require('../config/rateLimiter');
const { upload } = require('../config/multer');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const catalogController = require('../controllers/catalog.controller');

router.post('/upload', uploadRateLimiter, authenticateToken, requireAdmin, upload.single('file'), catalogController.upload);
router.delete('/', adminRateLimiter, authenticateToken, requireAdmin, catalogController.clear);

// Embedding management
router.post('/embeddings', adminRateLimiter, authenticateToken, requireAdmin, catalogController.generateEmbeddings);
router.get('/embeddings/stats', adminRateLimiter, authenticateToken, requireAdmin, catalogController.embeddingStats);

module.exports = router;
