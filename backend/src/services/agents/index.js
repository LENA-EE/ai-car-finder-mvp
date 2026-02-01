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
 * │  🔍 Parser Agent        │  ← Extracts filters
 * └───────────┬─────────────┘
 *             │
 *             ↓
 * ┌─────────────────────────┐
 * │  💬 Response Agent      │  ← (Future) Generates responses
 * └─────────────────────────┘
 */

const { validateQuery } = require('./security.agent');

module.exports = {
  security: { validateQuery },
};
