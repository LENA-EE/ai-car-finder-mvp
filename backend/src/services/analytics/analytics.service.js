const sessionsRepo = require('../../repositories/sessions.repository');
const carsRepo = require('../../repositories/cars.repository');
const config = require('../../config');
const agentsConfig = require('../../config/agents');

async function getAnalytics() {
  const [todayStats, methodStats, topBrands, catalogSize] = await Promise.all([
    sessionsRepo.getTodayStats(),
    sessionsRepo.getMethodStats(),
    sessionsRepo.getTopBrands(),
    carsRepo.getCatalogCount()
  ]);

  const stats = todayStats.rows[0];
  const requests = parseInt(stats.requests) || 0;
  const successfulParses = parseInt(stats.successful_parses) || 0;
  const accuracy = requests > 0 ? successfulParses / requests : 0;

  const methodBreakdown = {};
  for (const row of methodStats.rows) {
    methodBreakdown[row.parsing_method] = parseInt(row.count);
  }

  const topBrandsWithShare = topBrands.rows.map(b => ({
    name: b.name,
    count: parseInt(b.count),
    share: requests > 0 ? parseInt(b.count) / requests : 0
  }));

  return {
    today: {
      requests,
      parsing_accuracy: Math.round(accuracy * 1000) / 1000,
      llm_cost_usd: parseFloat(stats.total_cost) || 0,
      methods: methodBreakdown
    },
    top_brands: topBrandsWithShare,
    catalog: {
      total_records: catalogSize,
      last_updated: new Date().toISOString()
    },
    llm_enabled: config.llmEnabled,
    agents: {
      security: {
        enabled: agentsConfig.security.enabled,
        model: agentsConfig.security.enabled ? agentsConfig.security.model : null,
        fallback: 'regex'
      },
      parser: {
        enabled: config.llmEnabled,
        model: config.llmEnabled ? agentsConfig.parser.model : null,
        fallback: 'keyword'
      },
      response: {
        enabled: agentsConfig.response.enabled,
        model: agentsConfig.response.enabled ? agentsConfig.response.model : null,
        fallback: 'templates'
      }
    }
  };
}

module.exports = { getAnalytics };
