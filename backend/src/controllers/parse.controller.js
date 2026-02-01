const config = require('../config');
const { llmParse } = require('../services/parsing/llm.service');
const { keywordParse } = require('../services/parsing/keyword.service');
const { generateMessage } = require('../services/parsing/message.service');
const { searchCars } = require('../services/search/cars.service');
const { logParseSession } = require('../repositories/sessions.repository');
const { logErrorToGraveyard } = require('../repositories/errors.repository');
const { security } = require('../services/agents');

const MIN_FILTERS_REQUIRED = 3;

async function parse(req, res) {
  const { query, limit = 10, offset = 0 } = req.body;

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'INVALID_QUERY', details: 'Query too short' });
  }

  const safeLimit = Math.min(Math.max(1, parseInt(limit) || 10), 50);
  const safeOffset = Math.max(0, parseInt(offset) || 0);

  const startTime = Date.now();
  let filters = null;
  let parsingMethod = 'keyword';
  let costUsd = 0;
  let securityCheck = null;

  // Step 1: Security Agent validates query
  if (config.llmEnabled) {
    securityCheck = await security.validateQuery(query);

    if (!securityCheck.safe) {
      const latencyMs = Date.now() - startTime;
      logParseSession(query, null, 'blocked', latencyMs, 0, 0);
      logErrorToGraveyard(query, securityCheck.category);

      const message = generateMessage(query, null, { length: 0 }, securityCheck.category);

      return res.json({
        success: false,
        catalog_status: 'loaded',
        filters: null,
        results: [],
        total: 0,
        limit: safeLimit,
        offset: safeOffset,
        hasMore: false,
        message,
        metrics: {
          parsing_method: 'blocked',
          latency_ms: latencyMs,
          cost_usd: 0,
          security: {
            category: securityCheck.category,
            reason: securityCheck.reason
          }
        }
      });
    }
  }

  // Step 2: Parser Agent extracts filters
  if (config.llmEnabled) {
    try {
      const llmResult = await llmParse(query);
      filters = llmResult.filters;
      costUsd = llmResult.costUsd;
      parsingMethod = 'llm';
      console.log(`LLM parsed: ${JSON.stringify(filters)}, cost: $${costUsd}`);
    } catch (err) {
      console.error('LLM parse error, falling back to keyword:', err.message);
      filters = keywordParse(query);
      parsingMethod = 'keyword';
    }
  } else {
    filters = keywordParse(query);
    parsingMethod = 'keyword';
  }

  let results = [];
  let total = 0;
  let errorType = null;
  const filterCount = filters ? Object.keys(filters).length : 0;

  if (filters && filterCount >= MIN_FILTERS_REQUIRED) {
    try {
      const searchResult = await searchCars(filters, safeLimit, safeOffset);
      results = searchResult.items;
      total = searchResult.total;
      if (total === 0 && filters.mark_name) {
        errorType = 'no_results';
      }
    } catch (err) {
      console.error('Search error:', err.message);
      errorType = 'search_error';
    }
  } else if (filters && filterCount < MIN_FILTERS_REQUIRED) {
    errorType = 'insufficient_filters';
    console.log(`Insufficient filters: ${filterCount}/${MIN_FILTERS_REQUIRED} (${JSON.stringify(filters)})`);
  } else {
    errorType = 'parse_failed';
  }

  const latencyMs = Date.now() - startTime;
  logParseSession(query, filters, parsingMethod, latencyMs, costUsd, total);

  if (errorType) {
    logErrorToGraveyard(query, errorType);
  }

  const message = generateMessage(query, filters, { length: total }, errorType);

  res.json({
    success: filters !== null && filterCount >= MIN_FILTERS_REQUIRED,
    catalog_status: 'loaded',
    filters,
    results,
    total,
    limit: safeLimit,
    offset: safeOffset,
    hasMore: safeOffset + results.length < total,
    message,
    metrics: {
      parsing_method: parsingMethod,
      latency_ms: latencyMs,
      cost_usd: costUsd
    }
  });
}

module.exports = { parse };
