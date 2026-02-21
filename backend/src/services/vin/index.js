/**
 * VIN Services Index
 *
 * Exports all VIN-related services.
 */

const validator = require('./validator');
const decoder = require('./decoder.service');
const checker = require('./checker.service');
const fnp = require('./fnp.service');

module.exports = {
  validator,
  decoder,
  checker,
  fnp,
};
