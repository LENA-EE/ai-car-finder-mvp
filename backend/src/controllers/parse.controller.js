const config = require('../config');
const { llmParse } = require('../services/parsing/llm.service');
const { keywordParse } = require('../services/parsing/keyword.service');
const { generateMessage } = require('../services/parsing/message.service');
const { searchCars } = require('../services/search/cars.service');
const { semanticSearch, hybridSearch, isSemanticSearchAvailable } = require('../services/search/semantic.service');
const { logParseSession } = require('../repositories/sessions.repository');
const { logErrorToGraveyard } = require('../repositories/errors.repository');
const { security, classifier } = require('../services/agents');

const MIN_FILTERS_REQUIRED = 3;

async function parse(req, res) {
  try {
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
      try {
        securityCheck = await security.validateQuery(query);
      } catch (secErr) {
        console.error('Security agent error, skipping:', secErr.message);
        securityCheck = { safe: true, category: 'error', reason: 'Security check failed' };
      }

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

  // Step 2: Classify query type (filters, semantic, hybrid)
  let queryType = 'filters';
  let classification = null;

  if (config.llmEnabled && isSemanticSearchAvailable()) {
    try {
      classification = await classifier.classifyQuery(query);
      queryType = classification.queryType;
      console.log(`[Classifier] Query type: ${queryType} (${classification.confidence})`);
    } catch (classifyErr) {
      console.error('Classifier error, defaulting to filters:', classifyErr.message);
      queryType = 'filters';
    }
  }

  // Step 3: Parser Agent extracts filters (for filters and hybrid modes)
  if (queryType !== 'semantic') {
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
  }

  // Step 4: Execute search based on query type
  let results = [];
  let total = 0;
  let errorType = null;
  let searchMetrics = {};
  const filterCount = filters ? Object.keys(filters).length : 0;

  try {
    if (queryType === 'semantic') {
      // Pure semantic search
      parsingMethod = 'semantic';
      const searchResult = await semanticSearch(query, { limit: safeLimit });
      results = searchResult.items;
      total = searchResult.total;
      searchMetrics = searchResult.metrics || {};

      if (total === 0) {
        errorType = 'no_semantic_results';
      }
    } else if (queryType === 'hybrid' && isSemanticSearchAvailable()) {
      // Hybrid search: semantic + filters
      parsingMethod = 'hybrid';
      const searchResult = await hybridSearch(query, filters || {}, { limit: safeLimit });
      results = searchResult.items;
      total = searchResult.total;
      searchMetrics = searchResult.metrics || {};

      if (total === 0) {
        // Fallback to pure filter search
        if (filters && filterCount >= MIN_FILTERS_REQUIRED) {
          const fallbackResult = await searchCars(filters, safeLimit, safeOffset);
          results = fallbackResult.items;
          total = fallbackResult.total;
          parsingMethod = 'hybrid_fallback';
        }
        if (total === 0) {
          errorType = 'no_results';
        }
      }
    } else {
      // Traditional filter-based search
      if (filters && filterCount >= MIN_FILTERS_REQUIRED) {
        const searchResult = await searchCars(filters, safeLimit, safeOffset);
        results = searchResult.items;
        total = searchResult.total;
        if (total === 0 && filters.mark_name) {
          errorType = 'no_results';
        }
      } else if (filters && filterCount < MIN_FILTERS_REQUIRED) {
        // Try semantic search as fallback for insufficient filters
        if (isSemanticSearchAvailable()) {
          console.log('Insufficient filters, trying semantic search fallback');
          const semanticResult = await semanticSearch(query, { limit: safeLimit });
          if (semanticResult.total > 0) {
            results = semanticResult.items;
            total = semanticResult.total;
            parsingMethod = 'semantic_fallback';
            searchMetrics = semanticResult.metrics || {};
          } else {
            errorType = 'insufficient_filters';
          }
        } else {
          errorType = 'insufficient_filters';
          console.log(`Insufficient filters: ${filterCount}/${MIN_FILTERS_REQUIRED} (${JSON.stringify(filters)})`);
        }
      } else {
        errorType = 'parse_failed';
      }
    }
  } catch (searchErr) {
    console.error('Search error:', searchErr.message);
    errorType = 'search_error';
  }

  const latencyMs = Date.now() - startTime;
  logParseSession(query, filters, parsingMethod, latencyMs, costUsd, total);

  if (errorType) {
    logErrorToGraveyard(query, errorType);
  }

  const message = generateMessage(query, filters, { length: total }, errorType);

  res.json({
    success: total > 0,
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
      query_type: queryType,
      latency_ms: latencyMs,
      cost_usd: costUsd,
      ...searchMetrics,
      classification: classification ? {
        type: classification.queryType,
        confidence: classification.confidence,
        method: classification.method,
      } : null,
    }
  });

  } catch (err) {
    console.error('Parse controller error:', err);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Что-то пошло не так, попробуйте ещё раз',
      details: err.message
    });
  }
}

module.exports = { parse };
