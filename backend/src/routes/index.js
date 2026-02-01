const express = require('express');
const router = express.Router();

const publicRoutes = require('./public.routes');
const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const errorsRoutes = require('./errors.routes');
const catalogRoutes = require('./catalog.routes');

// Public API
router.use('/api/v1', publicRoutes);

// Auth API
router.use('/api/v1/admin/auth', authRoutes);

// Admin API
router.use('/api/v1/admin', adminRoutes);

// Errors API
router.use('/api/v1/admin/errors', errorsRoutes);

// Catalog API
router.use('/api/v1/admin/catalog', catalogRoutes);

module.exports = router;
