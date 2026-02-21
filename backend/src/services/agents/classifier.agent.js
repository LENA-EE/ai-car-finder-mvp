/**
 * Classifier Agent
 *
 * Determines the type of search query:
 * - "filters" - specific car search (brand, model, year, etc.)
 * - "semantic" - abstract/conceptual search (reliable, family car, etc.)
 * - "hybrid" - combination of both (economical BMW under 3M)
 *
 * Has regex fallback if LLM is unavailable.
 */

const { openai } = require('../../config/openai');
const agentsConfig = require('../../config/agents');

// ============================================
// REGEX PATTERNS FOR FALLBACK
// ============================================

// Patterns indicating filter-based search
const FILTER_PATTERNS = [
  /bmw|бмв|бумер|мерседес|mercedes|toyota|тойота|audi|ауди|honda|хонда|kia|киа|hyundai|хёндай|хендай|lexus|лексус|volkswagen|фольксваген/i,
  /x[1-7]|q[3578]|c[a-z]*\s*class|e[a-z]*\s*class|s[a-z]*\s*class|camry|камри|rav4|рав4|corolla|королла/i,
  /\d{4}\s*(год|г\.?|года)/i,  // Year patterns
  /до\s*\d+\s*(млн|миллион|тыс|рубл)/i,  // Price patterns
  /от\s*\d+\s*(млн|миллион|тыс|рубл)/i,
  /дизел|бензин|гибрид|электро/i,  // Engine type
  /автомат|механик|акпп|мкпп|робот|вариатор/i,  // Transmission
  /полный привод|4wd|awd|передний привод|задний привод/i,  // Drive type
];

// Patterns indicating semantic search
const SEMANTIC_PATTERNS = [
  /надёжн|надежн|reliable/i,
  /семейн|family/i,
  /экономичн|экономн|economical/i,
  /безопасн|safe/i,
  /комфортн|comfortable/i,
  /престижн|premium|люкс|luxury/i,
  /практичн|practical/i,
  /для города|городск/i,
  /для трассы|для путешеств/i,
  /просторн|вместительн|spacious/i,
  /динамичн|быстр|спортивн/i,
  /первая машина|первый автомобиль/i,
  /для бездорожья|внедорожн/i,
  /бюджетн|недорог|дешёв/i,
];

/**
 * Regex-based classification (fallback)
 */
function regexClassify(query) {
  const q = query.toLowerCase();

  let hasFilters = false;
  let hasSemantic = false;

  // Check for filter patterns
  for (const pattern of FILTER_PATTERNS) {
    if (pattern.test(q)) {
      hasFilters = true;
      break;
    }
  }

  // Check for semantic patterns
  for (const pattern of SEMANTIC_PATTERNS) {
    if (pattern.test(q)) {
      hasSemantic = true;
      break;
    }
  }

  let queryType;
  if (hasFilters && hasSemantic) {
    queryType = 'hybrid';
  } else if (hasSemantic) {
    queryType = 'semantic';
  } else {
    queryType = 'filters';
  }

  return {
    queryType,
    confidence: 0.7,
    method: 'regex',
    reason: hasFilters
      ? (hasSemantic ? 'Both specific and abstract patterns found' : 'Specific car parameters detected')
      : (hasSemantic ? 'Abstract/conceptual query detected' : 'Default to filter search'),
  };
}

// ============================================
// LLM CLASSIFICATION PROMPT
// ============================================

const CLASSIFIER_PROMPT = `Ты классификатор запросов для автомобильного поисковика. Определи тип поискового запроса.

ТИПЫ ЗАПРОСОВ:

1. "filters" - конкретный поиск по параметрам:
   - Указана марка/модель: "BMW X5", "тойота камри"
   - Указаны технические параметры: "дизель 2.0", "автомат"
   - Указан год/цена: "2020 года", "до 3 млн"
   - Примеры: "хочу бмв х5 дизель", "камри 2020 до 2 млн", "кроссовер полный привод"

2. "semantic" - абстрактный/концептуальный поиск:
   - НЕ указана конкретная марка/модель
   - Описаны желаемые характеристики: "надёжная", "семейная", "экономичная"
   - Описано назначение: "для города", "для путешествий", "для бездорожья"
   - Примеры: "надёжная семейная машина", "экономичная для города", "первая машина для девушки"

3. "hybrid" - комбинация конкретных параметров и абстрактных характеристик:
   - Указана марка/модель + абстрактные характеристики
   - Указана цена + абстрактные требования
   - Примеры: "экономичный BMW до 3 млн", "надёжный кроссовер Тойота", "комфортный седан 2020+"

ВАЖНО:
- Если запрос содержит ТОЛЬКО сленг марки (бумер, гелик) БЕЗ абстрактных характеристик → "filters"
- Если запрос содержит абстрактные слова + конкретные параметры → "hybrid"
- Если ТОЛЬКО абстрактные характеристики без конкретики → "semantic"

Отвечай ТОЛЬКО JSON:
{"queryType": "filters|semantic|hybrid", "confidence": 0.0-1.0, "reason": "краткое пояснение"}`;

/**
 * Classify query using LLM
 */
async function classifyQuery(query) {
  // If classifier disabled or no API, use regex
  if (!agentsConfig.classifier?.enabled || !openai) {
    console.log('[ClassifierAgent] Disabled or no client, using regex fallback');
    return regexClassify(query);
  }

  try {
    const response = await openai.chat.completions.create({
      model: agentsConfig.classifier.model,
      messages: [
        { role: 'system', content: CLASSIFIER_PROMPT },
        { role: 'user', content: query }
      ],
      temperature: agentsConfig.classifier.temperature,
      max_tokens: agentsConfig.classifier.max_tokens,
      response_format: { type: 'json_object' }
    });

    const content = response?.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[ClassifierAgent] Empty response, falling back to regex');
      return regexClassify(query);
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (parseErr) {
      console.error(`[ClassifierAgent] Invalid JSON: ${content}, falling back to regex`);
      return regexClassify(query);
    }

    // Validate queryType
    const validTypes = ['filters', 'semantic', 'hybrid'];
    if (!validTypes.includes(result.queryType)) {
      console.error(`[ClassifierAgent] Invalid queryType: ${result.queryType}, falling back to regex`);
      return regexClassify(query);
    }

    console.log(`[ClassifierAgent] Classified: ${result.queryType} (${result.confidence}): "${query.substring(0, 50)}"`);

    return {
      queryType: result.queryType,
      confidence: result.confidence || 0.8,
      method: 'llm',
      model: agentsConfig.classifier.model,
      reason: result.reason || '',
    };

  } catch (err) {
    console.error(`[ClassifierAgent] LLM error: ${err.message}, falling back to regex`);
    return regexClassify(query);
  }
}

module.exports = {
  classifyQuery,
  regexClassify,
};
