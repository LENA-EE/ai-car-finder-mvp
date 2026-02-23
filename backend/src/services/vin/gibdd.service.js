/**
 * GIBDD Service (via api-assist.com)
 *
 * Checks vehicle history in Russian Traffic Police database:
 * - Accidents (ДТП)
 * - Wanted status (Розыск)
 * - Restrictions (Ограничения)
 *
 * API: api-assist.com (200 free requests/month)
 * Docs: https://api-assist.com/api/gibdd
 */

const https = require('https');
const config = require('../../config');

const API_BASE = 'https://service.api-assist.com/parser/gibdd_api';
const TIMEOUT_MS = 15000;

/**
 * Check VIN in GIBDD database
 * @param {string} vin - VIN number
 * @returns {Promise<Object>}
 */
async function checkGibdd(vin) {
  const apiKey = config.vin.gibddApiKey;

  if (!apiKey) {
    return {
      available: false,
      message: 'ГИБДД проверка не настроена (требуется GIBDD_API_KEY)',
    };
  }

  try {
    // Run all three checks in parallel
    const [accidents, wanted, restrictions] = await Promise.all([
      fetchEndpoint('accident', vin, apiKey),
      fetchEndpoint('wanted', vin, apiKey),
      fetchEndpoint('restrict', vin, apiKey),
    ]);

    return formatResponse(vin, accidents, wanted, restrictions);
  } catch (error) {
    return {
      available: false,
      error: error.message,
      message: 'Ошибка проверки ГИБДД',
    };
  }
}

/**
 * Fetch data from api-assist endpoint
 */
function fetchEndpoint(endpoint, vin, apiKey) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}/${endpoint}?key=${apiKey}&vin=${vin}`;

    const req = https.get(url, { timeout: TIMEOUT_MS }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);

          if (res.statusCode === 200) {
            resolve({ success: true, data: json, endpoint });
          } else if (res.statusCode === 403) {
            resolve({
              success: false,
              error: 'access_denied',
              message: json.error || 'Доступ запрещён',
              endpoint,
            });
          } else {
            resolve({
              success: false,
              error: 'api_error',
              message: json.error || `HTTP ${res.statusCode}`,
              endpoint,
            });
          }
        } catch (e) {
          resolve({
            success: false,
            error: 'parse_error',
            message: 'Ошибка разбора ответа',
            endpoint,
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: 'network_error',
        message: error.message,
        endpoint,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'timeout',
        message: 'Превышено время ожидания',
        endpoint,
      });
    });
  });
}

/**
 * Format combined response from all endpoints
 */
function formatResponse(vin, accidents, wanted, restrictions) {
  // Check if any endpoint returned access denied (invalid key)
  if (
    accidents.error === 'access_denied' ||
    wanted.error === 'access_denied' ||
    restrictions.error === 'access_denied'
  ) {
    return {
      available: false,
      message: 'ГИБДД: неверный API ключ или превышен лимит запросов',
    };
  }

  // Parse accidents
  const accidentsList = parseAccidents(accidents);
  const accidentsCount = accidentsList.length;

  // Parse wanted status
  const wantedInfo = parseWanted(wanted);
  const isWanted = wantedInfo.isWanted;

  // Parse restrictions
  const restrictionsList = parseRestrictions(restrictions);
  const restrictionsCount = restrictionsList.length;

  // Calculate status
  let status = 'ok';
  if (isWanted) {
    status = 'danger';
  } else if (restrictionsCount > 0) {
    status = 'danger';
  } else if (accidentsCount > 0) {
    status = 'warning';
  }

  // Generate message
  const parts = [];
  if (isWanted) {
    parts.push('🚨 АВТО В РОЗЫСКЕ!');
  }
  if (restrictionsCount > 0) {
    parts.push(`Ограничений: ${restrictionsCount}`);
  }
  if (accidentsCount > 0) {
    parts.push(`ДТП: ${accidentsCount}`);
  }
  if (parts.length === 0) {
    parts.push('Проблем не обнаружено');
  }

  return {
    available: true,
    vin: vin,
    status: status,
    message: parts.join(', '),

    // Detailed data
    wanted: isWanted,
    wantedInfo: wantedInfo.details,

    accidentsCount: accidentsCount,
    accidents: accidentsList,

    restrictionsCount: restrictionsCount,
    restrictions: restrictionsList,

    // Raw responses for debugging
    _raw: {
      accidents: accidents.data,
      wanted: wanted.data,
      restrictions: restrictions.data,
    },
  };
}

/**
 * Parse accidents response
 */
function parseAccidents(response) {
  if (!response.success || !response.data) return [];

  const data = response.data;

  // api-assist returns { success: 1, RequestResult: { Records: [...] } }
  if (data.success === 1 && data.RequestResult?.Records) {
    return data.RequestResult.Records.map((record) => ({
      date: record.AccidentDateTime || null,
      type: record.AccidentType || 'ДТП',
      region: record.RegionName || null,
      damage: record.DamagePoints || null,
    }));
  }

  // Handle array format
  if (Array.isArray(data)) {
    return data.map((item) => ({
      date: item.date || item.AccidentDateTime || null,
      type: item.type || item.AccidentType || 'ДТП',
      region: item.region || item.RegionName || null,
      damage: item.damage || item.DamagePoints || null,
    }));
  }

  return [];
}

/**
 * Parse wanted status response
 */
function parseWanted(response) {
  if (!response.success || !response.data) {
    return { isWanted: false, details: null };
  }

  const data = response.data;

  // api-assist returns { success: 1, RequestResult: { Records: [...] } }
  if (data.success === 1 && data.RequestResult?.Records?.length > 0) {
    const record = data.RequestResult.Records[0];
    return {
      isWanted: true,
      details: {
        region: record.w_reg_inic || null,
        date: record.w_date_pu || null,
        model: record.w_model || null,
        year: record.w_god_vyp || null,
      },
    };
  }

  return { isWanted: false, details: null };
}

/**
 * Parse restrictions response
 */
function parseRestrictions(response) {
  if (!response.success || !response.data) return [];

  const data = response.data;

  // api-assist returns { success: 1, RequestResult: { Records: [...] } }
  if (data.success === 1 && data.RequestResult?.Records) {
    return data.RequestResult.Records.map((record) => ({
      type: record.ogrkod || 'Ограничение',
      date: record.dateogr || null,
      region: record.divtype || null,
      initiator: record.gession || null,
      reason: record.osnession || null,
    }));
  }

  // Handle array format
  if (Array.isArray(data)) {
    return data.map((item) => ({
      type: item.type || item.ogrkod || 'Ограничение',
      date: item.date || item.dateogr || null,
      region: item.region || item.divtype || null,
      initiator: item.initiator || item.gession || null,
      reason: item.reason || item.osnession || null,
    }));
  }

  return [];
}

module.exports = {
  checkGibdd,
};
