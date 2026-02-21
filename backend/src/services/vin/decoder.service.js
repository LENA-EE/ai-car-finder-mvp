/**
 * VIN Decoder Service
 *
 * Decodes VIN to brand, model, year, country.
 * Phase 3 implementation.
 */

const { validate, extractComponents, decodeYear } = require('./validator');
const vinRepo = require('../../repositories/vin.repository');

/**
 * Decode VIN
 * @param {string} vin - Raw VIN input
 * @returns {Promise<Object>}
 */
async function decode(vin) {
  // Validate VIN
  const validation = validate(vin);
  if (!validation.valid) {
    return validation;
  }

  const normalizedVin = validation.vin;
  const components = extractComponents(normalizedVin);

  // Lookup WMI (manufacturer)
  const wmiData = await vinRepo.getWmiData(components.wmi);

  // Decode year
  const year = decodeYear(components.yearCode);

  return {
    valid: true,
    vin: normalizedVin,
    decode: {
      wmi: components.wmi,
      region: wmiData?.region || 'Unknown',
      country: wmiData?.country || 'Unknown',
      manufacturer: wmiData?.manufacturer || 'Unknown',
      brand: extractBrand(wmiData?.manufacturer),
      year: year,
      yearCode: components.yearCode,
      plantCode: components.plantCode,
      serial: components.serial,
      checkDigit: components.checkDigit,
    },
  };
}

/**
 * Extract brand from manufacturer name
 */
function extractBrand(manufacturer) {
  if (!manufacturer) return 'Unknown';

  // Common patterns
  const brandMap = {
    'BMW': 'BMW',
    'Mercedes': 'Mercedes-Benz',
    'Audi': 'Audi',
    'Volkswagen': 'Volkswagen',
    'Porsche': 'Porsche',
    'Toyota': 'Toyota',
    'Honda': 'Honda',
    'Nissan': 'Nissan',
    'Mazda': 'Mazda',
    'Subaru': 'Subaru',
    'Suzuki': 'Suzuki',
    'Kia': 'Kia',
    'Hyundai': 'Hyundai',
    'Ford': 'Ford',
    'Chevrolet': 'Chevrolet',
    'Jeep': 'Jeep',
    'Renault': 'Renault',
    'Peugeot': 'Peugeot',
    'Citroën': 'Citroën',
    'Fiat': 'Fiat',
    'Alfa Romeo': 'Alfa Romeo',
    'Ferrari': 'Ferrari',
    'Lamborghini': 'Lamborghini',
    'Jaguar': 'Jaguar',
    'Land Rover': 'Land Rover',
    'Volvo': 'Volvo',
    'Škoda': 'Škoda',
    'SEAT': 'SEAT',
    'Lada': 'Lada',
    'AvtoVAZ': 'Lada',
    'Geely': 'Geely',
    'BYD': 'BYD',
    'MINI': 'MINI',
    'Opel': 'Opel',
  };

  for (const [key, brand] of Object.entries(brandMap)) {
    if (manufacturer.includes(key)) {
      return brand;
    }
  }

  // Return first word as brand
  return manufacturer.split(' ')[0];
}

module.exports = {
  decode,
};
