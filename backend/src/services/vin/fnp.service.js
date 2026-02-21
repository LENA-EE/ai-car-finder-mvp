/**
 * ФНП (Федеральная Нотариальная Палата) Service
 *
 * Checks car pledges in the Federal Notary Chamber registry.
 * API: reestr-zalogov.ru
 * Free, no registration, no captcha.
 *
 * Note: API is only accessible from Russian IPs.
 * Set FNP_MOCK=true for testing outside Russia.
 */

const https = require('https');

const FNP_API_URL = 'https://www.reestr-zalogov.ru/api/search';
const TIMEOUT_MS = 10000;
const MOCK_MODE = process.env.FNP_MOCK === 'true';

/**
 * Check VIN in FNP pledge registry
 * @param {string} vin - VIN number
 * @returns {Promise<Object>}
 */
async function checkPledges(vin) {
  // Mock mode for testing outside Russia
  if (MOCK_MODE) {
    return getMockResponse(vin);
  }

  try {
    const response = await fetchFnpApi(vin);
    return parseResponse(response, vin);
  } catch (error) {
    // Provide more context about geo-restrictions
    const isConnectionError =
      error.message.includes('ECONNRESET') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNREFUSED');

    return {
      available: false,
      error: error.message,
      message: isConnectionError
        ? 'Реестр ФНП недоступен (возможно, требуется российский IP)'
        : 'Ошибка проверки залогов в реестре ФНП',
    };
  }
}

/**
 * Mock response for testing
 */
function getMockResponse(vin) {
  // Simulate pledge for VINs ending with 'Z' (for testing)
  if (vin.endsWith('Z')) {
    return {
      available: true,
      vin: vin,
      pledgesCount: 1,
      pledges: [
        {
          pledgor: 'АО "Тест-Банк"',
          date: '2024-01-15',
          number: '2024-001-MOCK-123',
          type: 'залог',
        },
      ],
      status: 'danger',
      message: '⚠️ ТЕСТ: Обнаружен залог',
      mock: true,
    };
  }

  return {
    available: true,
    vin: vin,
    pledgesCount: 0,
    pledges: [],
    status: 'ok',
    message: 'Залогов не обнаружено',
    mock: true,
  };
}

/**
 * Fetch data from FNP API
 */
function fetchFnpApi(vin) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      filter: { vin: vin },
    });

    const url = new URL(FNP_API_URL);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        Accept: 'application/json',
        'User-Agent': 'AI-Car-Finder/1.0',
      },
      timeout: TIMEOUT_MS,
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Invalid JSON response from FNP'));
          }
        } else {
          reject(new Error(`FNP API returned status ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`FNP API error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('FNP API timeout'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Parse FNP API response
 */
function parseResponse(response, vin) {
  // Handle different response formats
  const total = response.total || response.count || 0;
  const results = response.results || response.data || [];

  if (total === 0 || results.length === 0) {
    return {
      available: true,
      vin: vin,
      pledgesCount: 0,
      pledges: [],
      status: 'ok',
      message: 'Залогов не обнаружено',
    };
  }

  const pledges = results.map((item) => ({
    pledgor: item.pledgor || item.pledgee || item.holder || 'Неизвестно',
    date: item.date || item.registrationDate || item.created_at || null,
    number: item.number || item.contractNumber || item.notification_number || null,
    type: item.type || 'залог',
  }));

  return {
    available: true,
    vin: vin,
    pledgesCount: pledges.length,
    pledges: pledges,
    status: 'danger',
    message: `Обнаружено залогов: ${pledges.length}`,
  };
}

module.exports = {
  checkPledges,
};
