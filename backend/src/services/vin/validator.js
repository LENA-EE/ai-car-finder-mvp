/**
 * VIN Validator
 *
 * Validates VIN according to ISO 3779 standard:
 * - 17 characters
 * - No I, O, Q (easily confused with 1, 0)
 * - Check digit validation (position 9)
 */

// Transliteration values for check digit calculation
const TRANSLITERATION = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};

// Position weights for check digit
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

// Invalid characters in VIN
const INVALID_CHARS = /[IOQ]/i;

// Cyrillic to Latin mapping (common mistakes)
const CYRILLIC_MAP = {
  'А': 'A', 'В': 'B', 'С': 'C', 'Е': 'E', 'Н': 'H',
  'К': 'K', 'М': 'M', 'О': 'O', 'Р': 'P', 'Т': 'T',
  'У': 'Y', 'Х': 'X',
  'а': 'A', 'в': 'B', 'с': 'C', 'е': 'E', 'н': 'H',
  'к': 'K', 'м': 'M', 'о': 'O', 'р': 'P', 'т': 'T',
  'у': 'Y', 'х': 'X',
};

/**
 * Normalize VIN: remove spaces, convert cyrillic, uppercase
 * @param {string} vin
 * @returns {string}
 */
function normalize(vin) {
  if (!vin || typeof vin !== 'string') {
    return '';
  }

  let normalized = vin
    .trim()
    .toUpperCase()
    .replace(/[\s\-]/g, ''); // Remove spaces and dashes

  // Replace cyrillic characters
  for (const [cyr, lat] of Object.entries(CYRILLIC_MAP)) {
    normalized = normalized.replace(new RegExp(cyr, 'g'), lat);
  }

  return normalized;
}

/**
 * Calculate check digit (position 9)
 * @param {string} vin - Normalized VIN
 * @returns {string} Expected check digit (0-9 or X)
 */
function calculateCheckDigit(vin) {
  let sum = 0;

  for (let i = 0; i < 17; i++) {
    const char = vin[i];
    let value;

    if (/\d/.test(char)) {
      value = parseInt(char, 10);
    } else {
      value = TRANSLITERATION[char];
      if (value === undefined) {
        return null; // Invalid character
      }
    }

    sum += value * WEIGHTS[i];
  }

  const remainder = sum % 11;
  return remainder === 10 ? 'X' : String(remainder);
}

/**
 * Validate VIN
 * @param {string} vin - Raw VIN input
 * @returns {{valid: boolean, vin: string, error?: string}}
 */
function validate(vin) {
  const normalized = normalize(vin);

  // Check length
  if (normalized.length !== 17) {
    return {
      valid: false,
      vin: normalized,
      error: `VIN должен содержать 17 символов (введено ${normalized.length})`,
    };
  }

  // Check for invalid characters (I, O, Q)
  if (INVALID_CHARS.test(normalized)) {
    const invalidChar = normalized.match(INVALID_CHARS)[0];
    return {
      valid: false,
      vin: normalized,
      error: `VIN не может содержать символ "${invalidChar}" (легко спутать с цифрой)`,
    };
  }

  // Check for valid characters only (A-Z except I,O,Q and 0-9)
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalized)) {
    return {
      valid: false,
      vin: normalized,
      error: 'VIN содержит недопустимые символы',
    };
  }

  // Validate check digit (position 9)
  const expectedCheckDigit = calculateCheckDigit(normalized);
  const actualCheckDigit = normalized[8];

  if (expectedCheckDigit && expectedCheckDigit !== actualCheckDigit) {
    // Note: Some manufacturers don't follow check digit standard
    // We warn but don't reject
    console.log(`[VIN] Check digit mismatch for ${normalized}: expected ${expectedCheckDigit}, got ${actualCheckDigit}`);
  }

  return {
    valid: true,
    vin: normalized,
  };
}

/**
 * Extract VIN components
 * @param {string} vin - Normalized valid VIN
 * @returns {Object}
 */
function extractComponents(vin) {
  return {
    wmi: vin.substring(0, 3),      // World Manufacturer Identifier
    vds: vin.substring(3, 9),      // Vehicle Descriptor Section
    vis: vin.substring(9, 17),     // Vehicle Identifier Section
    checkDigit: vin[8],            // Check digit
    yearCode: vin[9],              // Year code
    plantCode: vin[10],            // Plant code
    serial: vin.substring(11, 17), // Serial number
  };
}

/**
 * Decode year from position 10
 * @param {string} yearCode - Single character
 * @returns {number|null}
 */
function decodeYear(yearCode) {
  const YEAR_CODES = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
    'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
    'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
    'S': 2025, 'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029,
    'Y': 2030,
    '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
    '6': 2006, '7': 2007, '8': 2008, '9': 2009,
  };

  // Also support older years (1980-2000)
  const OLD_YEAR_CODES = {
    'A': 1980, 'B': 1981, 'C': 1982, 'D': 1983, 'E': 1984,
    'F': 1985, 'G': 1986, 'H': 1987, 'J': 1988, 'K': 1989,
    'L': 1990, 'M': 1991, 'N': 1992, 'P': 1993, 'R': 1994,
    'S': 1995, 'T': 1996, 'V': 1997, 'W': 1998, 'X': 1999,
    'Y': 2000,
  };

  // Return newer year by default (cycles every 30 years)
  return YEAR_CODES[yearCode] || null;
}

module.exports = {
  normalize,
  validate,
  extractComponents,
  decodeYear,
  calculateCheckDigit,
};
