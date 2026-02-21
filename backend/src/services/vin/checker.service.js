/**
 * VIN Checker Service
 *
 * Orchestrates VIN checks across multiple sources.
 */

const decoder = require('./decoder.service');
const fnpService = require('./fnp.service');
const vinRepo = require('../../repositories/vin.repository');
const config = require('../../config');

/**
 * Check VIN across all enabled sources
 * @param {string} vin - VIN number
 * @param {string[]} sources - Sources to check (default: all enabled)
 * @returns {Promise<Object>}
 */
async function checkVin(vin, sources = null) {
  // Decode first
  const decodeResult = await decoder.decode(vin);
  if (!decodeResult.valid) {
    return decodeResult;
  }

  const enabledSources = sources || getEnabledSources();
  const results = {
    vin: decodeResult.vin,
    decode: decodeResult.decode,
    gibdd: null,
    fnp: null,
    fssp: null,
    status: 'ok',
    summary: '',
    checkedAt: new Date().toISOString(),
  };

  // Check each source (placeholder - will be implemented in phases 4-6)
  if (enabledSources.includes('gibdd')) {
    results.gibdd = {
      available: false,
      message: 'ГИБДД проверка не настроена (требуется RUCAPTCHA_API_KEY)',
    };
  }

  if (enabledSources.includes('fnp')) {
    try {
      results.fnp = await fnpService.checkPledges(results.vin);
    } catch (error) {
      results.fnp = {
        available: false,
        error: error.message,
        message: 'Ошибка проверки залогов ФНП',
      };
    }
  }

  if (enabledSources.includes('fssp')) {
    results.fssp = {
      available: false,
      message: 'ФССП проверка не настроена (требуется FSSP_API_TOKEN)',
    };
  }

  // Calculate status
  results.status = calculateStatus(results);
  results.summary = generateSummary(results);

  // Cache result
  await vinRepo.saveCheck(
    results.vin,
    results,
    results.status,
    config.vin.cacheTtlSeconds
  );

  return results;
}

/**
 * Get list of enabled sources from config
 */
function getEnabledSources() {
  const sources = [];
  if (config.vin.sources.gibdd) sources.push('gibdd');
  if (config.vin.sources.fnp) sources.push('fnp');
  if (config.vin.sources.fssp) sources.push('fssp');
  return sources;
}

/**
 * Calculate overall status based on check results
 */
function calculateStatus(results) {
  // Danger conditions
  if (results.gibdd?.wanted) return 'danger';
  if (results.fnp?.pledgesCount > 0) return 'danger';
  if (results.fssp?.enforcementsCount > 0) return 'danger';

  // Warning conditions
  if (results.gibdd?.accidentsCount > 0) return 'warning';
  if (results.gibdd?.ownersCount > 3) return 'warning';

  return 'ok';
}

/**
 * Generate human-readable summary
 */
function generateSummary(results) {
  const parts = [];

  parts.push(`${results.decode.brand} ${results.decode.year || ''} (${results.decode.country})`);

  if (results.status === 'ok') {
    parts.push('✅ Проблем не обнаружено');
  } else if (results.status === 'warning') {
    parts.push('⚠️ Есть замечания');
  } else if (results.status === 'danger') {
    parts.push('🚨 Обнаружены проблемы!');
  }

  return parts.join(' — ');
}

module.exports = {
  checkVin,
};
