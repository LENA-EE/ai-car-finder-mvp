/**
 * Chat Routes
 */

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

// POST /api/v1/chat - Process chat message
router.post('/', chatController.chat);

module.exports = router;
