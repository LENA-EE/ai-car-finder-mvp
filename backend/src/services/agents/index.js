/**
 * Multi-Agent System
 *
 * Architecture:
 * ┌─────────────────────────┐
 * │  🛡️ Security Agent      │  ← Validates input
 * └───────────┬─────────────┘
 *             │ safe ✓
 *             ↓
 * ┌─────────────────────────┐
 * │  🎯 Classifier Agent    │  ← Determines query type
 * └───────────┬─────────────┘
 *             │ filters/semantic/hybrid
 *             ↓
 * ┌─────────────────────────┐
 * │  🔍 Parser Agent        │  ← Extracts filters (if needed)
 * └───────────┬─────────────┘
 *             │
 *             ↓
 * ┌─────────────────────────┐
 * │  🔎 Search (SQL/Vector) │  ← Executes search
 * └───────────┬─────────────┘
 *             │
 *             ↓
 * ┌─────────────────────────┐
 * │  💬 Response Agent      │  ← (Future) Generates responses
 * └─────────────────────────┘
 */

const { validateQuery } = require('./security.agent');
const { classifyQuery } = require('./classifier.agent');

module.exports = {
  security: { validateQuery },
  classifier: { classifyQuery },
};
