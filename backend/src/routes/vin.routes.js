/**
 * VIN Routes
 *
 * /api/v1/vin/*
 */

const express = require('express');
const router = express.Router();
const { userRateLimiter } = require('../config/rateLimiter');
const vinController = require('../controllers/vin.controller');

// Public endpoints (rate limited)
router.post('/decode', userRateLimiter, vinController.decode);
router.post('/check', userRateLimiter, vinController.check);
router.get('/check/:vin', userRateLimiter, vinController.getCached);

module.exports = router;
