/**
 * NHTSA vPIC API Service
 *
 * Free VIN decoder API from US Department of Transportation.
 * No registration, no API key, no limits.
 *
 * Docs: https://vpic.nhtsa.dot.gov/api/
 */

const https = require('https');

const API_BASE = 'https://vpic.nhtsa.dot.gov/api/vehicles';
const TIMEOUT_MS = 10000;

/**
 * Decode VIN using NHTSA API
 * @param {string} vin - VIN number (17 chars)
 * @returns {Promise<Object>}
 */
async function decodeVin(vin) {
  try {
    const url = `${API_BASE}/decodevin/${vin}?format=json`;
    const response = await fetchJson(url);

    if (!response.Results || response.Results.length === 0) {
      return { available: false, error: 'No data from NHTSA' };
    }

    return {
      available: true,
      vin: vin,
      data: parseResults(response.Results),
      raw: response.Results,
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
    };
  }
}

/**
 * Parse NHTSA results into structured object
 */
function parseResults(results) {
  // NHTSA returns "-" or empty string for missing values
  const cleanValue = (val) => {
    if (!val || val === '-' || val === 'Not Applicable' || val === '') {
      return null;
    }
    return val.trim();
  };

  const getValue = (variableId) => {
    const item = results.find((r) => r.VariableId === variableId);
    return cleanValue(item?.Value);
  };

  const getByName = (name) => {
    const item = results.find((r) => r.Variable === name);
    return cleanValue(item?.Value);
  };

  return {
    // Basic info
    make: getByName('Make') || getValue(26),
    model: getByName('Model') || getValue(28),
    year: getByName('Model Year') || getValue(29),

    // Manufacturer
    manufacturer: getByName('Manufacturer Name') || getValue(27),
    plantCountry: getByName('Plant Country') || getValue(75),
    plantCity: getByName('Plant City') || getValue(31),
    plantState: getByName('Plant State') || getValue(77),

    // Vehicle type
    vehicleType: getByName('Vehicle Type') || getValue(39),
    bodyClass: getByName('Body Class') || getValue(5),
    doors: getByName('Doors') || getValue(14),

    // Engine
    engineCylinders: getByName('Engine Number of Cylinders') || getValue(9),
    engineDisplacement: getByName('Displacement (L)') || getValue(11),
    engineHP: getByName('Engine Brake (hp) From') || getValue(71),
    fuelType: getByName('Fuel Type - Primary') || getValue(24),

    // Drivetrain
    driveType: getByName('Drive Type') || getValue(15),
    transmission: getByName('Transmission Style') || getValue(37),

    // Safety
    abs: getByName('Anti-lock Braking System (ABS)') || getValue(86),
    airbags: getByName('Front Air Bag Locations') || getValue(7),

    // Additional
    trim: getByName('Trim') || getValue(38),
    series: getByName('Series') || getValue(34),
    gvwr: getByName('Gross Vehicle Weight Rating From') || getValue(25),

    // Error info (if any)
    errorCode: getByName('Error Code'),
    errorText: getByName('Error Text'),
  };
}

/**
 * Fetch JSON from URL
 */
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: TIMEOUT_MS }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON from NHTSA'));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`NHTSA API error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('NHTSA API timeout'));
    });
  });
}

module.exports = {
  decodeVin,
};
