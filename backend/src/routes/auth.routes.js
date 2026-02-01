const express = require('express');
const router = express.Router();
const { adminRateLimiter } = require('../config/rateLimiter');
const { authenticateToken } = require('../middleware/auth');
const authController = require('../controllers/auth.controller');

router.post('/login', adminRateLimiter, authController.login);
router.get('/me', adminRateLimiter, authenticateToken, authController.me);

module.exports = router;
