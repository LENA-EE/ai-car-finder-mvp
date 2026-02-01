const { getSynonyms } = require('../config/synonyms.service');

function keywordParse(query) {
  const q = query.toLowerCase();
  const filters = {};
  const SYNONYMS = getSynonyms();

  const BRAND_KEYWORDS = {
    'бумер': 'BMW', 'бэха': 'BMW', 'бмв': 'BMW', 'bmw': 'BMW',
    'мерс': 'Mercedes-Benz', 'мерин': 'Mercedes-Benz', 'мерседес': 'Mercedes-Benz',
    'тойота': 'Toyota', 'тоёта': 'Toyota', 'toyota': 'Toyota',
    'ауди': 'Audi', 'аудюха': 'Audi', 'audi': 'Audi',
    'лексус': 'Lexus', 'lexus': 'Lexus',
    'хонда': 'Honda', 'honda': 'Honda',
    'мазда': 'Mazda', 'mazda': 'Mazda',
    'ниссан': 'Nissan', 'nissan': 'Nissan',
    'хёндай': 'Hyundai', 'хундай': 'Hyundai', 'хендай': 'Hyundai', 'hyundai': 'Hyundai',
    'киа': 'Kia', 'кия': 'Kia', 'kia': 'Kia',
    'фольц': 'Volkswagen', 'фольксваген': 'Volkswagen', 'vw': 'Volkswagen',
    ...SYNONYMS
  };

  for (const [slang, brand] of Object.entries(BRAND_KEYWORDS)) {
    if (q.includes(slang)) {
      filters.mark_name = brand;
      break;
    }
  }

  const modelMatch = q.match(/\b(x[1-7]|rav4|camry|corolla|a[1-8]|q[2-8]|c-class|e-class|s-class|3-series|5-series)\b/i);
  if (modelMatch) filters.folder_name = modelMatch[0].toUpperCase();

  if (q.includes('дизель') || q.includes('diesel') || q.includes('тди') || q.includes('tdi')) {
    filters.engine_type = 'diesel';
  } else if (q.includes('бензин') || q.includes('petrol')) {
    filters.engine_type = 'petrol';
  } else if (q.includes('гибрид') || q.includes('hybrid')) {
    filters.engine_type = 'hybrid';
  } else if (q.includes('электро') || q.includes('electric') || q.includes('ev')) {
    filters.engine_type = 'electric';
  }

  const volumeMatch = q.match(/(\d+[.,]?\d*)\s*(л|l|литр)/);
  if (volumeMatch) filters.engine_volume_min = parseFloat(volumeMatch[1].replace(',', '.'));

  const priceKMatch = q.match(/до?\s*(\d+)\s*к(?:\s|,|$)/i);
  if (priceKMatch) {
    filters.price_max = parseInt(priceKMatch[1]) * 1000;
  }
  const priceMlnMatch = q.match(/до?\s*(\d+[.,]?\d*)\s*(млн|миллион)/i);
  if (priceMlnMatch) {
    filters.price_max = Math.round(parseFloat(priceMlnMatch[1].replace(',', '.')) * 1000000);
  }
  const priceTysMatch = q.match(/до?\s*(\d+)\s*(тыс|тысяч)/i);
  if (priceTysMatch) {
    filters.price_max = parseInt(priceTysMatch[1]) * 1000;
  }

  const yearMatch = q.match(/(20\d{2})/);
  if (yearMatch) filters.year_from = parseInt(yearMatch[1]);

  if (q.includes('внедорожник') || q.includes('джип') || q.includes('кросс') || q.includes('паркетник')) {
    filters.body_type = 'Внедорожник 5 дв.';
  } else if (q.includes('седан') || q.includes('седло')) {
    filters.body_type = 'Седан';
  } else if (q.includes('хэтч') || q.includes('хэтчбек') || q.match(/\bхэ\b/)) {
    filters.body_type = 'Хэтчбек 5 дв.';
  } else if (q.includes('универсал') || q.includes('сарай')) {
    filters.body_type = 'Универсал';
  } else if (q.includes('купе')) {
    filters.body_type = 'Купе';
  }

  if (q.includes('полный') || q.includes('4wd') || q.includes('4х4') || q.includes('4x4') || q.includes('4вд') || q.includes('awd')) {
    filters.drive_type = '4WD';
  } else if (q.includes('передний') || q.includes('fwd')) {
    filters.drive_type = 'FWD';
  } else if (q.includes('задний') || q.includes('rwd')) {
    filters.drive_type = 'RWD';
  }

  if (q.includes('автомат') || q.includes('акпп') || q.match(/\bат\b/)) {
    filters.transmission = 'AT';
  } else if (q.includes('механика') || q.includes('мкпп') || q.includes('мешалка') || q.includes('ручка')) {
    filters.transmission = 'MT';
  } else if (q.includes('вариатор') || q.includes('cvt')) {
    filters.transmission = 'CVT';
  } else if (q.includes('робот') || q.includes('amt')) {
    filters.transmission = 'AMT';
  }

  return Object.keys(filters).length >= 1 ? filters : null;
}

module.exports = { keywordParse };
