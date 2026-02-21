require('dotenv').config({ path: '../.env' });

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  llmEnabled: !!process.env.OPENROUTER_API_KEY,

  // VIN Decoder config
  vin: {
    cacheTtlSeconds: parseInt(process.env.VIN_CACHE_TTL) || 86400, // 24 hours
    sources: {
      gibdd: process.env.GIBDD_ENABLED === 'true',
      fnp: process.env.FNP_ENABLED !== 'false', // enabled by default
      fssp: process.env.FSSP_ENABLED === 'true',
    },
    rucaptchaApiKey: process.env.RUCAPTCHA_API_KEY || null,
    fsspApiToken: process.env.FSSP_API_TOKEN || null,
  },
};
