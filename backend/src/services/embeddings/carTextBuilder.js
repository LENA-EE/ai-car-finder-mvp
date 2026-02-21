/**
 * Car Text Builder
 *
 * Converts car data into rich text descriptions for embedding generation.
 * Adds semantic keywords based on car characteristics to enable
 * semantic searches like "надёжная семейная машина".
 */

// Semantic keywords based on car characteristics
const SEMANTIC_KEYWORDS = {
  // Body type mappings
  bodyType: {
    'ВНЕДОРОЖНИК 5 ДВ.': ['внедорожник', 'SUV', 'семейная', 'просторная', 'вместительная', 'для путешествий'],
    'ВНЕДОРОЖНИК 3 ДВ.': ['внедорожник', 'SUV', 'компактный', 'спортивный'],
    'КРОССОВЕР': ['кроссовер', 'городской', 'семейная', 'универсальная', 'практичная'],
    'СЕДАН': ['седан', 'бизнес', 'комфорт', 'представительский', 'практичная'],
    'УНИВЕРСАЛ': ['универсал', 'семейная', 'вместительная', 'практичная', 'для дачи'],
    'ХЭТЧБЕК 5 ДВ.': ['хэтчбек', 'компактный', 'городской', 'экономичная', 'маневренная'],
    'ХЭТЧБЕК 3 ДВ.': ['хэтчбек', 'компактный', 'молодежная', 'спортивный'],
    'КУПЕ': ['купе', 'спортивный', 'стильный', 'премиум'],
    'КАБРИОЛЕТ': ['кабриолет', 'спортивный', 'летняя', 'стильный'],
    'МИНИВЭН': ['минивэн', 'семейная', 'просторная', 'вместительная', 'для большой семьи', '7 мест'],
    'ПИКАП': ['пикап', 'грузовой', 'рабочая', 'для бездорожья', 'мощный'],
    'ЛИФТБЕК': ['лифтбек', 'практичная', 'вместительная', 'современный'],
  },

  // Engine type mappings
  engineType: {
    'diesel': ['дизель', 'экономичная', 'тяговитая', 'для трассы', 'надёжная'],
    'petrol': ['бензин', 'резвая', 'динамичная'],
    'hybrid': ['гибрид', 'экономичная', 'экологичная', 'современная'],
    'electro': ['электро', 'электромобиль', 'экологичная', 'современная', 'бесшумная'],
  },

  // Drive type mappings
  driveType: {
    'полный': ['полный привод', '4WD', 'AWD', 'для бездорожья', 'уверенная', 'зимняя'],
    'передний': ['передний привод', 'FWD', 'экономичная', 'городская'],
    'задний': ['задний привод', 'RWD', 'спортивная', 'драйверская'],
  },

  // Transmission mappings
  transmission: {
    'автомат': ['автомат', 'АКПП', 'комфортная', 'удобная'],
    'механика': ['механика', 'МКПП', 'экономичная', 'спортивная'],
    'робот': ['робот', 'автомат', 'современная'],
    'вариатор': ['вариатор', 'CVT', 'плавная', 'экономичная'],
  },

  // Premium brands
  premiumBrands: ['BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Porsche', 'Jaguar', 'Land Rover', 'Volvo', 'Infiniti'],

  // Reliable brands (based on common perception)
  reliableBrands: ['Toyota', 'Lexus', 'Honda', 'Mazda', 'Subaru', 'Hyundai', 'Kia'],
};

/**
 * Build rich text description for a car
 * @param {Object} car - Car object from database
 * @returns {string} - Text description for embedding
 */
function buildCarText(car) {
  const parts = [];

  // Basic info
  const fullName = `${car.mark_name} ${car.folder_name || ''}`.trim();
  parts.push(fullName);

  // Year
  if (car.year) {
    parts.push(`${car.year} год`);
    if (car.year >= 2020) {
      parts.push('новая современная');
    } else if (car.year >= 2015) {
      parts.push('свежая');
    }
  }

  // Body type with semantic keywords
  if (car.body_type) {
    parts.push(car.body_type);
    const bodyKeywords = SEMANTIC_KEYWORDS.bodyType[car.body_type.toUpperCase()];
    if (bodyKeywords) {
      parts.push(bodyKeywords.join(' '));
    }
  }

  // Engine
  if (car.engine_volume) {
    parts.push(`${car.engine_volume} литра`);
    if (car.engine_volume >= 3.0) {
      parts.push('мощный большой мотор');
    } else if (car.engine_volume <= 1.6) {
      parts.push('экономичный компактный мотор');
    }
  }

  if (car.hp) {
    parts.push(`${car.hp} л.с.`);
    if (car.hp >= 300) {
      parts.push('мощная быстрая спортивная');
    } else if (car.hp >= 200) {
      parts.push('динамичная');
    } else if (car.hp <= 120) {
      parts.push('экономичная');
    }
  }

  // Engine type with semantic keywords
  if (car.engine_type) {
    const engineKeywords = SEMANTIC_KEYWORDS.engineType[car.engine_type.toLowerCase()];
    if (engineKeywords) {
      parts.push(engineKeywords.join(' '));
    }
  }

  // Transmission with semantic keywords
  if (car.transmission) {
    const transKeywords = SEMANTIC_KEYWORDS.transmission[car.transmission.toLowerCase()];
    if (transKeywords) {
      parts.push(transKeywords.join(' '));
    }
  }

  // Drive type with semantic keywords
  if (car.drive_type) {
    const driveKeywords = SEMANTIC_KEYWORDS.driveType[car.drive_type.toLowerCase()];
    if (driveKeywords) {
      parts.push(driveKeywords.join(' '));
    }
  }

  // Price category
  if (car.price) {
    if (car.price <= 1500000) {
      parts.push('бюджетная недорогая доступная');
    } else if (car.price <= 3000000) {
      parts.push('средний класс');
    } else if (car.price <= 5000000) {
      parts.push('бизнес класс');
    } else {
      parts.push('премиум люкс дорогая');
    }
  }

  // Brand characteristics
  const markUpper = (car.mark_name || '').toUpperCase();
  if (SEMANTIC_KEYWORDS.premiumBrands.some(b => b.toUpperCase() === markUpper)) {
    parts.push('премиум престижная комфорт');
  }
  if (SEMANTIC_KEYWORDS.reliableBrands.some(b => b.toUpperCase() === markUpper)) {
    parts.push('надёжная проверенная качественная');
  }

  // Special combinations
  if (car.body_type && car.body_type.toUpperCase().includes('ВНЕДОРОЖНИК') && car.drive_type === 'полный') {
    parts.push('настоящий внедорожник для бездорожья');
  }

  if (car.body_type && (car.body_type.toUpperCase().includes('МИНИВЭН') || car.body_type.toUpperCase().includes('УНИВЕРСАЛ'))) {
    parts.push('для семьи с детьми вместительный багажник');
  }

  return parts.join(' ');
}

/**
 * Build texts for multiple cars
 * @param {Object[]} cars - Array of car objects
 * @returns {Array<{id: number, text: string}>}
 */
function buildCarTexts(cars) {
  return cars.map(car => ({
    id: car.id,
    text: buildCarText(car),
  }));
}

module.exports = {
  buildCarText,
  buildCarTexts,
  SEMANTIC_KEYWORDS,
};
