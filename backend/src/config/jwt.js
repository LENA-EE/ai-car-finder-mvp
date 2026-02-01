module.exports = {
  secret: process.env.JWT_SECRET || 'dev-jwt-secret-32-characters-long',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
};
