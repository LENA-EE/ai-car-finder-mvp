/**
 * VIN Services Index
 *
 * Exports all VIN-related services.
 */

const validator = require('./validator');

// Decoder and checker will be added in Phase 3+
let decoder = null;
let checker = null;

try {
  decoder = require('./decoder.service');
} catch (e) {
  // Not implemented yet
}

try {
  checker = require('./checker.service');
} catch (e) {
  // Not implemented yet
}

module.exports = {
  validator,
  decoder,
  checker,
};
