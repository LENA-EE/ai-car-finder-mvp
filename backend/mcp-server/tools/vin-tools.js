/**
 * VIN Tools Implementation
 *
 * These tools call the backend VIN services directly.
 * The MCP server runs as a standalone process, so we need to either:
 * 1. Import services directly (same codebase)
 * 2. Call HTTP API (separate deployment)
 *
 * This implementation imports services directly for simplicity.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the path to the services
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const servicesPath = join(__dirname, '../../src/services/vin');

// Dynamic import for CommonJS modules
let validator, decoder, checker;

async function loadServices() {
  if (!validator) {
    const validatorModule = await import(join(servicesPath, 'validator.js'));
    validator = validatorModule.default || validatorModule;

    const decoderModule = await import(
      join(servicesPath, 'decoder.service.js')
    );
    decoder = decoderModule.default || decoderModule;

    const checkerModule = await import(
      join(servicesPath, 'checker.service.js')
    );
    checker = checkerModule.default || checkerModule;
  }
}

/**
 * Decode VIN and return vehicle information
 */
export async function decodeVin(vin) {
  await loadServices();

  const result = await decoder.decode(vin);

  if (!result.valid) {
    return {
      success: false,
      error: result.error,
      hint: result.hint,
    };
  }

  const { decode } = result;

  return {
    success: true,
    vin: result.vin,
    decoded: {
      brand: decode.brand,
      manufacturer: decode.manufacturer,
      country: decode.country,
      region: decode.region,
      year: decode.year,
      yearCode: decode.yearCode,
      plantCode: decode.plantCode,
      serial: decode.serial,
    },
    summary: `${decode.brand} ${decode.year || ''} (${decode.country})`,
  };
}

/**
 * Validate VIN format
 */
export async function validateVin(vin) {
  await loadServices();

  const result = validator.validate(vin);

  return {
    valid: result.valid,
    vin: result.vin,
    error: result.error,
    hint: result.hint,
  };
}

/**
 * Check vehicle history (GIBDD, FNP, FSSP)
 */
export async function checkVinHistory(vin, sources = null) {
  await loadServices();

  const result = await checker.checkVin(vin, sources);

  if (!result.decode) {
    return {
      success: false,
      error: result.error || 'Invalid VIN',
    };
  }

  // Format response for Claude
  const response = {
    success: true,
    vin: result.vin,
    vehicle: `${result.decode.brand} ${result.decode.year || ''} (${result.decode.country})`,
    status: result.status,
    summary: result.summary,
    checks: {},
  };

  // Add available check results
  if (result.gibdd) {
    response.checks.gibdd = formatCheckResult(result.gibdd, 'ГИБДД');
  }

  if (result.fnp) {
    response.checks.fnp = formatCheckResult(result.fnp, 'ФНП (Залоги)');
  }

  if (result.fssp) {
    response.checks.fssp = formatCheckResult(result.fssp, 'ФССП');
  }

  return response;
}

/**
 * Format check result for human readability
 */
function formatCheckResult(checkData, sourceName) {
  if (!checkData.available) {
    return {
      available: false,
      source: sourceName,
      message: checkData.message || `${sourceName} недоступен`,
    };
  }

  return {
    available: true,
    source: sourceName,
    status: checkData.status || 'ok',
    message: checkData.message,
    data: checkData,
  };
}
