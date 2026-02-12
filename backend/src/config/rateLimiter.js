const rateLimit = require('express-rate-limit');

const userRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_USER) || 100,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    details: 'Too many requests, please try again later',
    retry_after: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_ADMIN) || 50,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    details: 'Too many admin requests, please try again later',
    retry_after: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { keyGeneratorIpFallback: false },
});

const uploadRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    details: 'Too many file uploads, please wait 5 minutes',
    retry_after: 300
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  validate: { keyGeneratorIpFallback: false },
});

module.exports = { userRateLimiter, adminRateLimiter, uploadRateLimiter };
