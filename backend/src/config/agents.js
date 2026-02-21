/**
 * Multi-Agent System Configuration
 *
 * Easily swap models for different agents here.
 * Currently all agents use DeepSeek via OpenRouter.
 *
 * To switch to different models later:
 * - Security Agent: 'anthropic/claude-3-haiku' (fast, cheap)
 * - Classifier Agent: 'anthropic/claude-3-haiku' (fast classification)
 * - Parser Agent: 'openai/gpt-4o-mini' or 'anthropic/claude-3-sonnet'
 * - Response Agent: 'anthropic/claude-3-haiku' (fast responses)
 */

module.exports = {
  // Security Agent - validates input, detects injections
  security: {
    enabled: true,
    model: process.env.SECURITY_AGENT_MODEL || 'deepseek/deepseek-chat',
    temperature: 0.0,  // Deterministic for security
    max_tokens: 100,   // Short responses only
  },

  // Classifier Agent - determines query type (filters/semantic/hybrid)
  classifier: {
    enabled: true,
    model: process.env.CLASSIFIER_AGENT_MODEL || 'deepseek/deepseek-chat',
    temperature: 0.0,  // Deterministic classification
    max_tokens: 100,   // Short responses only
  },

  // Parser Agent - extracts search filters from text
  parser: {
    model: process.env.PARSER_AGENT_MODEL || 'deepseek/deepseek-chat',
    temperature: 0.1,
    max_tokens: 200,
  },

  // Response Agent - generates human-like responses (future)
  response: {
    enabled: false,  // Not implemented yet
    model: process.env.RESPONSE_AGENT_MODEL || 'deepseek/deepseek-chat',
    temperature: 0.7,  // More creative
    max_tokens: 300,
  },

  // Embeddings Configuration (via OpenRouter)
  embeddings: {
    model: 'openai/text-embedding-3-small',  // Via OpenRouter
    dimensions: 1536,
    batchSize: 100,  // Cars per batch for embedding generation
  },
};
