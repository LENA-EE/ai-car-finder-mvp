require('dotenv').config({ path: '../.env' });

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  llmEnabled: !!process.env.OPENROUTER_API_KEY,
};
