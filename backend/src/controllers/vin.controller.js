/**
 * VIN Controller
 *
 * Handles HTTP requests for VIN decode and check operations.
 */

const vinDecoder = require('../services/vin/decoder.service');
const vinChecker = require('../services/vin/checker.service');
const vinRepo = require('../repositories/vin.repository');

/**
 * POST /api/v1/vin/decode
 * Decode VIN without external API calls
 */
async function decode(req, res) {
  try {
    const { vin } = req.body;

    if (!vin) {
      return res.status(400).json({
        success: false,
        error: 'VIN_REQUIRED',
        details: 'VIN номер обязателен',
      });
    }

    const result = await vinDecoder.decode(vin);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_VIN',
        details: result.error,
        vin: result.vin,
      });
    }

    res.json({
      success: true,
      vin: result.vin,
      valid: true,
      decode: result.decode,
    });
  } catch (err) {
    console.error('VIN decode error:', err);
    res.status(500).json({
      success: false,
      error: 'DECODE_ERROR',
      details: err.message,
    });
  }
}

/**
 * POST /api/v1/vin/check
 * Full VIN check with external sources
 */
async function check(req, res) {
  try {
    const { vin, sources } = req.body;

    if (!vin) {
      return res.status(400).json({
        success: false,
        error: 'VIN_REQUIRED',
        details: 'VIN номер обязателен',
      });
    }

    // Check cache first
    const cached = await vinRepo.getCachedCheck(vin);
    if (cached) {
      return res.json({
        success: true,
        ...cached.result,
        cached: true,
        checkedAt: cached.checkedAt,
      });
    }

    // Perform full check
    const result = await vinChecker.checkVin(vin, sources);

    res.json({
      success: true,
      ...result,
      cached: false,
    });
  } catch (err) {
    console.error('VIN check error:', err);
    res.status(500).json({
      success: false,
      error: 'CHECK_ERROR',
      details: err.message,
    });
  }
}

/**
 * GET /api/v1/vin/check/:vin
 * Get cached check result
 */
async function getCached(req, res) {
  try {
    const { vin } = req.params;

    const cached = await vinRepo.getCachedCheck(vin);

    if (!cached) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        details: 'Проверка не найдена в кэше',
      });
    }

    res.json({
      success: true,
      ...cached.result,
      cached: true,
      checkedAt: cached.checkedAt,
      expiresAt: cached.expiresAt,
    });
  } catch (err) {
    console.error('VIN cache lookup error:', err);
    res.status(500).json({
      success: false,
      error: 'CACHE_ERROR',
      details: err.message,
    });
  }
}

module.exports = {
  decode,
  check,
  getCached,
};
