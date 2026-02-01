function errorHandler(err, req, res, next) {
  console.error('Unhandled error:', err.message);
  res.status(500).json({
    error: 'SERVER_ERROR',
    details: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
}

module.exports = { errorHandler };
