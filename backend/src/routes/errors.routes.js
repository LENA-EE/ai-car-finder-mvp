const express = require('express');
const router = express.Router();
const { adminRateLimiter } = require('../config/rateLimiter');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const errorsController = require('../controllers/errors.controller');

router.get('/', adminRateLimiter, authenticateToken, errorsController.getErrors);
router.post('/:id/resolve', adminRateLimiter, authenticateToken, requireAdmin, errorsController.resolveError);
router.delete('/:id', adminRateLimiter, authenticateToken, requireAdmin, errorsController.deleteError);

module.exports = router;
