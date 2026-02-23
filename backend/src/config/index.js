require('dotenv').config({ path: '../.env' });

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  llmEnabled: !!process.env.OPENROUTER_API_KEY,

  // Car Tools API (remote)
  toolsApi: {
    enabled: process.env.TOOLS_API_URL ? true : false,
    url: process.env.TOOLS_API_URL || 'https://car-tools-api-mcp.onrender.com',
  },

  // VIN Decoder config
  vin: {
    cacheTtlSeconds: parseInt(process.env.VIN_CACHE_TTL) || 86400, // 24 hours
    sources: {
      gibdd: process.env.GIBDD_API_KEY ? true : process.env.GIBDD_ENABLED === 'true',
      fnp: process.env.FNP_ENABLED !== 'false', // enabled by default
      fssp: process.env.FSSP_ENABLED === 'true',
    },
    gibddApiKey: process.env.GIBDD_API_KEY || null, // api-assist.com key
    fsspApiToken: process.env.FSSP_API_TOKEN || null,
  },
};
