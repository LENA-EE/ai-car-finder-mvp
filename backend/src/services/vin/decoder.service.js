/**
 * VIN Decoder Service
 *
 * Decodes VIN to brand, model, year, country.
 * Uses local WMI database + NHTSA API fallback.
 */

const { validate, extractComponents, decodeYear } = require('./validator');
const vinRepo = require('../../repositories/vin.repository');
const nhtsa = require('./nhtsa.service');

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

  // Lookup WMI (manufacturer) in local DB
  const wmiData = await vinRepo.getWmiData(components.wmi);

  // Decode year from VIN position
  const year = decodeYear(components.yearCode);

  // If local WMI lookup failed, try NHTSA API as fallback
  if (!wmiData) {
    try {
      const nhtsaResult = await nhtsa.decodeVin(normalizedVin);
      if (nhtsaResult.available && nhtsaResult.data) {
        const d = nhtsaResult.data;
        return {
          valid: true,
          vin: normalizedVin,
          source: 'nhtsa',
          decode: {
            wmi: components.wmi,
            region: d.plantCountry || 'Unknown',
            country: d.plantCountry || 'Unknown',
            manufacturer: d.manufacturer || 'Unknown',
            brand: d.make || 'Unknown',
            model: d.model || null,
            year: d.year ? parseInt(d.year, 10) : year,
            yearCode: components.yearCode,
            plantCode: components.plantCode,
            serial: components.serial,
            checkDigit: components.checkDigit,
            // Extra from NHTSA
            bodyClass: d.bodyClass || null,
            engineCylinders: d.engineCylinders || null,
            engineDisplacement: d.engineDisplacement || null,
            fuelType: d.fuelType || null,
            driveType: d.driveType || null,
            transmission: d.transmission || null,
          },
        };
      }
    } catch (err) {
      console.log('[VIN Decoder] NHTSA fallback failed:', err.message);
    }
  }

  return {
    valid: true,
    vin: normalizedVin,
    source: 'local',
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
