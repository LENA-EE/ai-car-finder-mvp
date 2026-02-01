const express = require('express');
const router = express.Router();
const { userRateLimiter } = require('../config/rateLimiter');
const parseController = require('../controllers/parse.controller');
const carsController = require('../controllers/cars.controller');
const healthController = require('../controllers/health.controller');

router.post('/parse', userRateLimiter, parseController.parse);
router.get('/cars/:id', userRateLimiter, carsController.getCar);
router.get('/health', healthController.health);

module.exports = router;
