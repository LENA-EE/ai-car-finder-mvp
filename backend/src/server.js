// TODO: остальное из architecture.txt
// - TypeScript миграция
// - JWT аутентификация
// - Rate limiting

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// OpenRouter client (OpenAI-compatible API)
const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

// Проверка доступности LLM
const LLM_ENABLED = !!process.env.OPENROUTER_API_KEY;

// Кэш синонимов и конфига (обновляется при старте и hot reload)
let SYNONYMS = {};
let promptConfig = {
  version: 1,
  system_prompt: `Ты парсер запросов для каталога Auto.ru.

СТРУКТУРА БД:
- mark_name: марка (BMW, Toyota, Mercedes-Benz)
- folder_name: модель (X5, RAV4, Camry)
- body_type: тип кузова (Внедорожник 5 дв., Седан, Хэтчбек)
- engine_volume_min/max: объём двигателя (2.0, 3.0)
- engine_type: тип двигателя (diesel, gasoline)
- min_hp/max_hp: мощность (150, 249)
- transmission: КПП (AT, MT, CVT)
- drive_type: привод (4WD, FWD, RWD)
- year_from/year_to: год выпуска (2019, 2020)
- price_min/price_max: цена в рублях (2000000, 5000000)

Сленг:
- бумер, бмв → BMW
- мерс, мерседес → Mercedes-Benz
- тойота → Toyota
- ауди → Audi
- лексус → Lexus

Преобразуй текст пользователя в JSON-фильтры.
Возвращай ТОЛЬКО валидный JSON без комментариев!`,
  temperature: 0.1,
  max_tokens: 200,
  updated_at: new Date().toISOString()
};

// Few-shot примеры для промпта
const FEW_SHOT_EXAMPLES = [
  {
    input: "бумер X5 дизель 3.0",
    output: { mark_name: "BMW", folder_name: "X5", engine_type: "diesel", engine_volume_min: 3.0 }
  },
  {
    input: "тойота внедорожник автомат",
    output: { mark_name: "Toyota", body_type: "Внедорожник 5 дв.", transmission: "AT" }
  },
  {
    input: "мерс до 5 миллионов 2020",
    output: { mark_name: "Mercedes-Benz", price_max: 5000000, year_from: 2020 }
  }
];

// Загрузка синонимов из БД
async function loadSynonyms() {
  try {
    const result = await pool.query(
      "SELECT slang, normalized FROM synonyms WHERE category = 'brands'"
    );
    SYNONYMS = {};
    for (const row of result.rows) {
      SYNONYMS[row.slang.toLowerCase()] = row.normalized;
    }
    console.log(`Loaded ${result.rows.length} synonyms from DB`);
  } catch (err) {
    console.error('Failed to load synonyms:', err.message);
  }
}

// Загрузка конфигурации промптов из БД
async function loadPromptConfig() {
  try {
    const result = await pool.query(
      "SELECT version, system_prompt, temperature, max_tokens, created_at FROM prompt_versions WHERE status = 'active' ORDER BY version DESC LIMIT 1"
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      promptConfig = {
        ...promptConfig,
        version: row.version,
        system_prompt: row.system_prompt,
        temperature: row.temperature,
        max_tokens: row.max_tokens,
        updated_at: row.created_at
      };
      console.log(`Loaded prompt config v${promptConfig.version} from DB`);
    }
  } catch (err) {
    console.error('Failed to load prompt config:', err.message);
  }
}

// LLM парсер (gpt-4o-mini)
async function llmParse(query) {
  // Формируем few-shot промпт
  const fewShotMessages = FEW_SHOT_EXAMPLES.flatMap(ex => [
    { role: 'user', content: ex.input },
    { role: 'assistant', content: JSON.stringify(ex.output) }
  ]);

  const messages = [
    { role: 'system', content: promptConfig.system_prompt },
    ...fewShotMessages,
    { role: 'user', content: query }
  ];

  const response = await openai.chat.completions.create({
    model: 'deepseek/deepseek-chat',
    messages,
    temperature: promptConfig.temperature,
    max_tokens: promptConfig.max_tokens,
    response_format: { type: 'json_object' }
  });

  const content = response.choices[0].message.content;
  const filters = JSON.parse(content);

  // Расчёт стоимости (deepseek-chat: $0.14/1M input, $0.28/1M output)
  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;
  const costUsd = (inputTokens * 0.00000014) + (outputTokens * 0.00000028);

  return {
    filters: Object.keys(filters).length > 0 ? filters : null,
    costUsd: Math.round(costUsd * 100000000) / 100000000 // 8 decimal places
  };
}

// Fallback парсер (keyword-based)
function keywordParse(query) {
  const q = query.toLowerCase();
  const filters = {};

  // Марка
  for (const [slang, brand] of Object.entries(SYNONYMS)) {
    if (q.includes(slang)) {
      filters.mark_name = brand;
      break;
    }
  }

  // Модель (простой паттерн)
  const modelMatch = q.match(/x\d|rav4|camry|a\d|q\d/i);
  if (modelMatch) filters.folder_name = modelMatch[0].toUpperCase();

  // Тип двигателя
  if (q.includes('дизель') || q.includes('diesel')) filters.engine_type = 'diesel';
  if (q.includes('бензин') || q.includes('petrol')) filters.engine_type = 'gasoline';

  // Объём двигателя
  const volumeMatch = q.match(/(\d+\.?\d*)\s*(л|l|литр)/);
  if (volumeMatch) filters.engine_volume_min = parseFloat(volumeMatch[1]);

  // Цена
  const priceMatch = q.match(/до\s*(\d+)\s*(млн|миллион)/i);
  if (priceMatch) filters.price_max = parseInt(priceMatch[1]) * 1000000;

  // Год
  const yearMatch = q.match(/(20\d{2})/);
  if (yearMatch) filters.year_from = parseInt(yearMatch[1]);

  // Кузов
  if (q.includes('внедорожник') || q.includes('джип')) filters.body_type = 'Внедорожник 5 дв.';
  if (q.includes('седан')) filters.body_type = 'Седан';

  // Привод
  if (q.includes('полный привод') || q.includes('4wd')) filters.drive_type = '4WD';

  // КПП
  if (q.includes('автомат') || q.includes('акпп')) filters.transmission = 'AT';
  if (q.includes('механика') || q.includes('мкпп')) filters.transmission = 'MT';

  return Object.keys(filters).length >= 1 ? filters : null;
}

// Поиск машин в PostgreSQL
async function searchCars(filters) {
  const conditions = [];
  const params = [];
  let paramIndex = 1;

  if (filters.mark_name) {
    conditions.push(`LOWER(mark_name) = LOWER($${paramIndex})`);
    params.push(filters.mark_name);
    paramIndex++;
  }

  if (filters.folder_name) {
    conditions.push(`LOWER(folder_name) LIKE LOWER($${paramIndex})`);
    params.push(`%${filters.folder_name}%`);
    paramIndex++;
  }

  if (filters.engine_type) {
    conditions.push(`engine_type = $${paramIndex}`);
    params.push(filters.engine_type);
    paramIndex++;
  }

  if (filters.engine_volume_min) {
    conditions.push(`engine_volume >= $${paramIndex}`);
    params.push(filters.engine_volume_min);
    paramIndex++;
  }

  if (filters.engine_volume_max) {
    conditions.push(`engine_volume <= $${paramIndex}`);
    params.push(filters.engine_volume_max);
    paramIndex++;
  }

  if (filters.body_type) {
    conditions.push(`body_type ILIKE $${paramIndex}`);
    params.push(`%${filters.body_type}%`);
    paramIndex++;
  }

  if (filters.transmission) {
    conditions.push(`transmission = $${paramIndex}`);
    params.push(filters.transmission);
    paramIndex++;
  }

  if (filters.drive_type) {
    conditions.push(`drive_type = $${paramIndex}`);
    params.push(filters.drive_type);
    paramIndex++;
  }

  if (filters.year_from) {
    conditions.push(`year >= $${paramIndex}`);
    params.push(filters.year_from);
    paramIndex++;
  }

  if (filters.year_to) {
    conditions.push(`year <= $${paramIndex}`);
    params.push(filters.year_to);
    paramIndex++;
  }

  if (filters.price_min) {
    conditions.push(`price >= $${paramIndex}`);
    params.push(filters.price_min);
    paramIndex++;
  }

  if (filters.price_max) {
    conditions.push(`price <= $${paramIndex}`);
    params.push(filters.price_max);
    paramIndex++;
  }

  if (filters.min_hp) {
    conditions.push(`hp >= $${paramIndex}`);
    params.push(filters.min_hp);
    paramIndex++;
  }

  if (filters.max_hp) {
    conditions.push(`hp <= $${paramIndex}`);
    params.push(filters.max_hp);
    paramIndex++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    SELECT id, mark_name, folder_name, body_type, engine_volume, hp,
           transmission, drive_type, engine_type, year, price
    FROM cars_catalog
    ${whereClause}
    ORDER BY year DESC, price ASC
    LIMIT 5
  `;

  const result = await pool.query(query, params);
  return result.rows.map(car => ({
    ...car,
    name: `${car.mark_name} ${car.folder_name}`,
    engine: `${car.engine_volume} ${car.engine_type === 'diesel' ? 'Diesel' : 'Petrol'}, ${car.hp} hp`
  }));
}

// Логирование запроса в БД
async function logParseSession(query, filters, method, latencyMs, costUsd, resultsCount) {
  try {
    await pool.query(
      `INSERT INTO parse_sessions (user_query, filters, parsing_method, latency_ms, cost_usd, catalog_status, results_count)
       VALUES ($1, $2, $3, $4, $5, 'loaded', $6)`,
      [query, JSON.stringify(filters), method, latencyMs, costUsd, resultsCount]
    );
  } catch (err) {
    console.error('Failed to log parse session:', err.message);
  }
}

// POST /api/v1/parse - основной endpoint
app.post('/api/v1/parse', async (req, res) => {
  const { query } = req.body;

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'INVALID_QUERY', details: 'Query too short' });
  }

  const startTime = Date.now();
  let filters = null;
  let parsingMethod = 'keyword';
  let costUsd = 0;

  // Пробуем LLM если доступен
  if (LLM_ENABLED) {
    try {
      const llmResult = await llmParse(query);
      filters = llmResult.filters;
      costUsd = llmResult.costUsd;
      parsingMethod = 'llm';
      console.log(`LLM parsed: ${JSON.stringify(filters)}, cost: $${costUsd}`);
    } catch (err) {
      console.error('LLM parse error, falling back to keyword:', err.message);
      // Fallback на keyword parser
      filters = keywordParse(query);
      parsingMethod = 'keyword';
    }
  } else {
    // LLM недоступен - используем keyword parser
    filters = keywordParse(query);
    parsingMethod = 'keyword';
  }

  let results = [];
  if (filters) {
    try {
      results = await searchCars(filters);
    } catch (err) {
      console.error('Search error:', err.message);
    }
  }

  const latencyMs = Date.now() - startTime;

  // Логируем в БД асинхронно
  logParseSession(query, filters, parsingMethod, latencyMs, costUsd, results.length);

  res.json({
    success: filters !== null,
    catalog_status: 'loaded',
    filters,
    results,
    metrics: {
      parsing_method: parsingMethod,
      latency_ms: latencyMs,
      cost_usd: costUsd
    }
  });
});

// GET /api/v1/cars/:id - детали машины
app.get('/api/v1/cars/:id', async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const result = await pool.query(
      `SELECT id, mark_name, folder_name, body_type, engine_volume, hp,
              transmission, drive_type, engine_type, year, price
       FROM cars_catalog WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', details: `Car ${id} not found` });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get car error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
});

// GET /api/v1/admin/analytics - дашборд
app.get('/api/v1/admin/analytics', async (req, res) => {
  try {
    // Статистика за сегодня
    const todayStats = await pool.query(`
      SELECT
        COUNT(*) as requests,
        COUNT(*) FILTER (WHERE filters IS NOT NULL) as successful_parses,
        COALESCE(SUM(cost_usd), 0) as total_cost
      FROM parse_sessions
      WHERE created_at >= CURRENT_DATE
    `);

    // Разбивка по методам парсинга
    const methodStats = await pool.query(`
      SELECT
        parsing_method,
        COUNT(*) as count
      FROM parse_sessions
      WHERE created_at >= CURRENT_DATE
      GROUP BY parsing_method
    `);

    // Top 5 марок за сегодня
    const topBrands = await pool.query(`
      SELECT
        filters->>'mark_name' as name,
        COUNT(*) as count
      FROM parse_sessions
      WHERE created_at >= CURRENT_DATE
        AND filters->>'mark_name' IS NOT NULL
      GROUP BY filters->>'mark_name'
      ORDER BY count DESC
      LIMIT 5
    `);

    // Размер каталога
    const catalogSize = await pool.query('SELECT COUNT(*) as total FROM cars_catalog');

    const stats = todayStats.rows[0];
    const requests = parseInt(stats.requests) || 0;
    const successfulParses = parseInt(stats.successful_parses) || 0;
    const accuracy = requests > 0 ? successfulParses / requests : 0;

    const methodBreakdown = {};
    for (const row of methodStats.rows) {
      methodBreakdown[row.parsing_method] = parseInt(row.count);
    }

    const topBrandsWithShare = topBrands.rows.map(b => ({
      name: b.name,
      count: parseInt(b.count),
      share: requests > 0 ? parseInt(b.count) / requests : 0
    }));

    res.json({
      today: {
        requests,
        parsing_accuracy: Math.round(accuracy * 1000) / 1000,
        llm_cost_usd: parseFloat(stats.total_cost) || 0,
        methods: methodBreakdown
      },
      top_brands: topBrandsWithShare,
      catalog: {
        total_records: parseInt(catalogSize.rows[0].total),
        last_updated: new Date().toISOString()
      },
      llm_enabled: LLM_ENABLED
    });
  } catch (err) {
    console.error('Analytics error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
});

// GET /api/v1/admin/prompts - получить текущий промпт
app.get('/api/v1/admin/prompts', async (req, res) => {
  res.json({
    ...promptConfig,
    synonyms: SYNONYMS,
    llm_enabled: LLM_ENABLED
  });
});

// POST /api/v1/admin/prompts - обновить промпт (hot reload)
app.post('/api/v1/admin/prompts', async (req, res) => {
  const { system_prompt, temperature, max_tokens, synonyms } = req.body;

  try {
    const previousVersion = promptConfig.version;
    const newVersion = previousVersion + 1;

    // Сохраняем новую версию в БД
    await pool.query(
      `INSERT INTO prompt_versions (version, system_prompt, temperature, max_tokens, status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [
        newVersion,
        system_prompt || promptConfig.system_prompt,
        temperature !== undefined ? temperature : promptConfig.temperature,
        max_tokens !== undefined ? max_tokens : promptConfig.max_tokens
      ]
    );

    // Архивируем старую версию
    await pool.query(
      `UPDATE prompt_versions SET status = 'archived' WHERE version = $1`,
      [previousVersion]
    );

    // Обновляем синонимы если переданы
    if (synonyms) {
      for (const [slang, normalized] of Object.entries(synonyms)) {
        await pool.query(
          `INSERT INTO synonyms (category, slang, normalized)
           VALUES ('brands', $1, $2)
           ON CONFLICT (category, slang) DO UPDATE SET normalized = $2`,
          [slang.toLowerCase(), normalized]
        );
      }
    }

    // Перезагружаем кэш
    await loadPromptConfig();
    await loadSynonyms();

    res.json({
      status: 'reloaded',
      previous_version: previousVersion,
      current_version: promptConfig.version,
      updated_at: promptConfig.updated_at
    });
  } catch (err) {
    console.error('Update prompts error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
});

// GET /health
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) as total FROM cars_catalog');
    res.json({
      status: 'healthy',
      database: 'connected',
      llm_enabled: LLM_ENABLED,
      catalog_status: 'loaded',
      catalog_size: parseInt(result.rows[0].total)
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      llm_enabled: LLM_ENABLED,
      error: err.message
    });
  }
});

// Инициализация при старте
async function init() {
  try {
    await pool.query('SELECT 1');
    console.log('PostgreSQL connected');
    await loadSynonyms();
    await loadPromptConfig();
  } catch (err) {
    console.error('Database connection failed:', err.message);
    console.log('Running without database (mock mode)');
  }

  if (LLM_ENABLED) {
    console.log('OpenRouter LLM enabled (deepseek/deepseek-chat)');
  } else {
    console.log('OpenRouter LLM disabled (no API key), using keyword parser');
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Backend: http://localhost:${PORT}`);
  console.log(`Parse:   POST http://localhost:${PORT}/api/v1/parse`);
  console.log(`Car:     GET  http://localhost:${PORT}/api/v1/cars/:id`);
  console.log(`Admin:   GET  http://localhost:${PORT}/api/v1/admin/analytics`);
  console.log(`Prompts: POST http://localhost:${PORT}/api/v1/admin/prompts`);
  await init();
});
