// TODO: остальное из architecture.txt
// - TypeScript миграция

const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const { Pool } = require('pg');
const OpenAI = require('openai');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { parse: csvParse } = require('csv-parse/sync');
const xml2js = require('xml2js');

const app = express();
app.use(cors());
app.use(express.json());

// File upload config (max 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// ===========================================
// RATE LIMITING
// ===========================================

// User rate limit: 100 req/min (согласно architecture.txt)
const userRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_USER) || 100,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    details: 'Too many requests, please try again later',
    retry_after: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.connection.remoteAddress
});

// Admin rate limit: 50 req/min (согласно architecture.txt)
const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_ADMIN) || 50,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    details: 'Too many admin requests, please try again later',
    retry_after: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip // По user ID если авторизован
});

// File upload rate limit: 1 req/5min (защита от спама загрузок)
const uploadRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    details: 'Too many file uploads, please wait 5 minutes',
    retry_after: 300
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip
});

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

// JWT config
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-32-characters-long';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

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

// ===========================================
// JWT MIDDLEWARE
// ===========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'UNAUTHENTICATED', details: 'Token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'FORBIDDEN', details: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Middleware для проверки роли admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'FORBIDDEN', details: 'Admin access required' });
  }
  next();
}

// Логирование действий админа
async function logAdminAction(adminId, adminEmail, actionType, payload, req) {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, admin_email, action_type, payload, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [adminId, adminEmail, actionType, JSON.stringify(payload), ip, userAgent]
    );
  } catch (err) {
    console.error('Failed to log admin action:', err.message);
  }
}

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

// LLM парсер
async function llmParse(query) {
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

  const inputTokens = response.usage?.prompt_tokens || 0;
  const outputTokens = response.usage?.completion_tokens || 0;
  const costUsd = (inputTokens * 0.00000014) + (outputTokens * 0.00000028);

  return {
    filters: Object.keys(filters).length > 0 ? filters : null,
    costUsd: Math.round(costUsd * 100000000) / 100000000
  };
}

// Fallback парсер (keyword-based)
function keywordParse(query) {
  const q = query.toLowerCase();
  const filters = {};

  for (const [slang, brand] of Object.entries(SYNONYMS)) {
    if (q.includes(slang)) {
      filters.mark_name = brand;
      break;
    }
  }

  const modelMatch = q.match(/x\d|rav4|camry|a\d|q\d/i);
  if (modelMatch) filters.folder_name = modelMatch[0].toUpperCase();

  if (q.includes('дизель') || q.includes('diesel')) filters.engine_type = 'diesel';
  if (q.includes('бензин') || q.includes('petrol')) filters.engine_type = 'gasoline';

  const volumeMatch = q.match(/(\d+\.?\d*)\s*(л|l|литр)/);
  if (volumeMatch) filters.engine_volume_min = parseFloat(volumeMatch[1]);

  const priceMatch = q.match(/до\s*(\d+)\s*(млн|миллион)/i);
  if (priceMatch) filters.price_max = parseInt(priceMatch[1]) * 1000000;

  const yearMatch = q.match(/(20\d{2})/);
  if (yearMatch) filters.year_from = parseInt(yearMatch[1]);

  if (q.includes('внедорожник') || q.includes('джип')) filters.body_type = 'Внедорожник 5 дв.';
  if (q.includes('седан')) filters.body_type = 'Седан';

  if (q.includes('полный привод') || q.includes('4wd')) filters.drive_type = '4WD';

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

// Логирование проблемных запросов в "кладбище ошибок"
async function logErrorToGraveyard(query, errorType) {
  try {
    // Нормализуем запрос для группировки похожих
    const pattern = query.toLowerCase().trim();

    await pool.query(
      `INSERT INTO error_graveyard (error_type, query_pattern, frequency, last_seen)
       VALUES ($1, $2, 1, NOW())
       ON CONFLICT (error_type, query_pattern)
       DO UPDATE SET frequency = error_graveyard.frequency + 1, last_seen = NOW()`,
      [errorType, pattern]
    );
  } catch (err) {
    console.error('Failed to log error to graveyard:', err.message);
  }
}

// ===========================================
// PUBLIC API
// ===========================================

// POST /api/v1/parse - основной endpoint (публичный)
app.post('/api/v1/parse', userRateLimiter, async (req, res) => {
  const { query } = req.body;

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'INVALID_QUERY', details: 'Query too short' });
  }

  const startTime = Date.now();
  let filters = null;
  let parsingMethod = 'keyword';
  let costUsd = 0;

  if (LLM_ENABLED) {
    try {
      const llmResult = await llmParse(query);
      filters = llmResult.filters;
      costUsd = llmResult.costUsd;
      parsingMethod = 'llm';
      console.log(`LLM parsed: ${JSON.stringify(filters)}, cost: $${costUsd}`);
    } catch (err) {
      console.error('LLM parse error, falling back to keyword:', err.message);
      filters = keywordParse(query);
      parsingMethod = 'keyword';
    }
  } else {
    filters = keywordParse(query);
    parsingMethod = 'keyword';
  }

  let results = [];
  let errorType = null;

  if (filters) {
    try {
      results = await searchCars(filters);
      // Если фильтры есть, но результатов нет - возможно неизвестная марка
      if (results.length === 0 && filters.mark_name) {
        errorType = 'no_results';
      }
    } catch (err) {
      console.error('Search error:', err.message);
      errorType = 'search_error';
    }
  } else {
    // Не удалось распарсить запрос
    errorType = 'parse_failed';
  }

  const latencyMs = Date.now() - startTime;
  logParseSession(query, filters, parsingMethod, latencyMs, costUsd, results.length);

  // Логируем проблемные запросы
  if (errorType) {
    logErrorToGraveyard(query, errorType);
  }

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

// GET /api/v1/cars/:id - детали машины (публичный)
app.get('/api/v1/cars/:id', userRateLimiter, async (req, res) => {
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

// GET /health (публичный)
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

// ===========================================
// AUTH API
// ===========================================

// POST /api/v1/admin/auth/login
app.post('/api/v1/admin/auth/login', adminRateLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'INVALID_REQUEST', details: 'Email and password required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, email, password_hash, role FROM admin_users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', details: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'INVALID_CREDENTIALS', details: 'Invalid email or password' });
    }

    // Обновляем last_login
    await pool.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Генерируем JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Логируем
    await logAdminAction(user.id, user.email, 'login', { success: true }, req);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      expires_in: JWT_EXPIRES_IN
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', details: err.message });
  }
});

// GET /api/v1/admin/auth/me - проверка токена
app.get('/api/v1/admin/auth/me', adminRateLimiter, authenticateToken, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role
  });
});

// ===========================================
// ADMIN API (JWT Protected)
// ===========================================

// GET /api/v1/admin/analytics - дашборд
app.get('/api/v1/admin/analytics', adminRateLimiter, authenticateToken, async (req, res) => {
  try {
    const todayStats = await pool.query(`
      SELECT
        COUNT(*) as requests,
        COUNT(*) FILTER (WHERE filters IS NOT NULL) as successful_parses,
        COALESCE(SUM(cost_usd), 0) as total_cost
      FROM parse_sessions
      WHERE created_at >= CURRENT_DATE
    `);

    const methodStats = await pool.query(`
      SELECT parsing_method, COUNT(*) as count
      FROM parse_sessions
      WHERE created_at >= CURRENT_DATE
      GROUP BY parsing_method
    `);

    const topBrands = await pool.query(`
      SELECT filters->>'mark_name' as name, COUNT(*) as count
      FROM parse_sessions
      WHERE created_at >= CURRENT_DATE AND filters->>'mark_name' IS NOT NULL
      GROUP BY filters->>'mark_name'
      ORDER BY count DESC
      LIMIT 5
    `);

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

// GET /api/v1/admin/prompts
app.get('/api/v1/admin/prompts', adminRateLimiter, authenticateToken, async (req, res) => {
  res.json({
    ...promptConfig,
    synonyms: SYNONYMS,
    llm_enabled: LLM_ENABLED
  });
});

// POST /api/v1/admin/prompts - обновить промпт (только admin)
app.post('/api/v1/admin/prompts', adminRateLimiter, authenticateToken, requireAdmin, async (req, res) => {
  const { system_prompt, temperature, max_tokens, synonyms } = req.body;

  try {
    const previousVersion = promptConfig.version;
    const newVersion = previousVersion + 1;

    await pool.query(
      `INSERT INTO prompt_versions (version, system_prompt, temperature, max_tokens, status, created_by)
       VALUES ($1, $2, $3, $4, 'active', $5)`,
      [
        newVersion,
        system_prompt || promptConfig.system_prompt,
        temperature !== undefined ? temperature : promptConfig.temperature,
        max_tokens !== undefined ? max_tokens : promptConfig.max_tokens,
        req.user.id
      ]
    );

    await pool.query(
      `UPDATE prompt_versions SET status = 'archived' WHERE version = $1`,
      [previousVersion]
    );

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

    await loadPromptConfig();
    await loadSynonyms();

    // Логируем действие
    await logAdminAction(req.user.id, req.user.email, 'edit_prompt', {
      previous_version: previousVersion,
      new_version: newVersion,
      changes: { system_prompt: !!system_prompt, temperature, max_tokens, synonyms_count: synonyms ? Object.keys(synonyms).length : 0 }
    }, req);

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

// GET /api/v1/admin/audit - аудит лог (только admin)
app.get('/api/v1/admin/audit', adminRateLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const result = await pool.query(
      `SELECT id, admin_email, action_type, payload, ip_address, created_at
       FROM admin_audit_log
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Audit log error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
});

// ===========================================
// ERROR GRAVEYARD API
// ===========================================

// GET /api/v1/admin/errors - список проблемных запросов
app.get('/api/v1/admin/errors', adminRateLimiter, authenticateToken, async (req, res) => {
  try {
    const showResolved = req.query.resolved === 'true';
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    const result = await pool.query(
      `SELECT id, error_type, query_pattern, frequency, last_seen, resolved, resolution_note
       FROM error_graveyard
       WHERE resolved = $1
       ORDER BY frequency DESC, last_seen DESC
       LIMIT $2`,
      [showResolved, limit]
    );

    // Статистика
    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE NOT resolved) as unresolved_count,
        COUNT(*) FILTER (WHERE resolved) as resolved_count,
        SUM(frequency) FILTER (WHERE NOT resolved) as total_occurrences,
        COUNT(DISTINCT error_type) FILTER (WHERE NOT resolved) as error_types
      FROM error_graveyard
    `);

    res.json({
      errors: result.rows,
      stats: {
        unresolved: parseInt(stats.rows[0].unresolved_count) || 0,
        resolved: parseInt(stats.rows[0].resolved_count) || 0,
        total_occurrences: parseInt(stats.rows[0].total_occurrences) || 0,
        error_types: parseInt(stats.rows[0].error_types) || 0
      }
    });
  } catch (err) {
    console.error('Error graveyard fetch error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
});

// POST /api/v1/admin/errors/:id/resolve - пометить как решённую
app.post('/api/v1/admin/errors/:id/resolve', adminRateLimiter, authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { resolution_note } = req.body;

  try {
    const result = await pool.query(
      `UPDATE error_graveyard
       SET resolved = true, resolution_note = $1
       WHERE id = $2
       RETURNING id, error_type, query_pattern, resolved`,
      [resolution_note || 'Resolved', id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', details: 'Error not found' });
    }

    await logAdminAction(req.user.id, req.user.email, 'resolve_error', {
      error_id: id,
      query_pattern: result.rows[0].query_pattern,
      resolution_note
    }, req);

    res.json({ success: true, error: result.rows[0] });
  } catch (err) {
    console.error('Error resolve error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
});

// DELETE /api/v1/admin/errors/:id - удалить запись об ошибке
app.delete('/api/v1/admin/errors/:id', adminRateLimiter, authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);

  try {
    const result = await pool.query(
      `DELETE FROM error_graveyard WHERE id = $1 RETURNING id, query_pattern`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'NOT_FOUND', details: 'Error not found' });
    }

    await logAdminAction(req.user.id, req.user.email, 'delete_error', {
      error_id: id,
      query_pattern: result.rows[0].query_pattern
    }, req);

    res.json({ success: true, deleted_id: id });
  } catch (err) {
    console.error('Error delete error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
});

// ===========================================
// XML Parser для Auto.ru формата
// ===========================================
async function parseAutoRuXml(content) {
  const parser = new xml2js.Parser({
    explicitArray: false,
    mergeAttrs: true,
    trim: true
  });

  const result = await parser.parseStringPromise(content);
  const records = [];

  // Функция для извлечения текста из элемента
  const getText = (obj) => {
    if (!obj) return null;
    if (typeof obj === 'string') return obj.trim();
    if (obj._) return obj._.trim();
    if (obj.$) return null;
    return String(obj).trim();
  };

  // Функция для извлечения атрибута
  const getAttr = (obj, attr) => {
    if (!obj) return null;
    if (obj.$ && obj.$[attr]) return obj.$[attr];
    if (obj[attr]) return obj[attr];
    return null;
  };

  // Обработка вложенной структуры Auto.ru: catalog > mark > folder > modification
  const processNestedStructure = (data) => {
    const catalog = data.catalog || data.cars || data.data || data;

    // Найдем марки
    let marks = catalog.mark || catalog.marks || catalog.brand || catalog.brands || [];
    if (!Array.isArray(marks)) marks = [marks];

    for (const mark of marks) {
      const markName = getAttr(mark, 'name') || getText(mark.name) || getText(mark.mark_name);
      const markCode = getAttr(mark, 'code') || getText(mark.code) || getText(mark.mark_code);

      if (!markName) continue;

      // Найдем модели/папки
      let folders = mark.folder || mark.folders || mark.model || mark.models || [];
      if (!Array.isArray(folders)) folders = [folders];

      for (const folder of folders) {
        const folderName = getAttr(folder, 'name') || getText(folder.name) || getText(folder.folder_name);
        const folderId = getAttr(folder, 'id') || getText(folder.id) || getText(folder.folder_id);

        // Найдем модификации
        let modifications = folder.modification || folder.modifications || folder.variant || folder.variants || [];
        if (!Array.isArray(modifications)) modifications = [modifications];

        if (modifications.length === 0) {
          // Если нет модификаций, создаем запись на уровне folder
          records.push({
            mark_name: markName,
            mark_code: markCode,
            folder_name: folderName,
            folder_id: folderId,
            body_type: getText(folder.body_type),
            engine_volume: parseFloat(getText(folder.engine_volume)) || null,
            hp: parseInt(getText(folder.hp) || getText(folder.power)) || null,
            transmission: getText(folder.transmission),
            drive_type: getText(folder.drive_type) || getText(folder.drive),
            engine_type: getText(folder.engine_type) || getText(folder.fuel),
            year: parseInt(getText(folder.year)) || null,
            year_from: parseInt(getText(folder.year_from)) || null,
            year_to: parseInt(getText(folder.year_to)) || null,
            price: parseInt(getText(folder.price)) || null
          });
        } else {
          for (const mod of modifications) {
            records.push({
              mark_name: markName,
              mark_code: markCode,
              folder_name: folderName,
              folder_id: folderId,
              model_name: getText(mod.model_name) || getText(mod.model),
              modification_name: getAttr(mod, 'name') || getText(mod.name) || getText(mod.modification_name),
              modification_id: getAttr(mod, 'id') || getText(mod.id) || getText(mod.modification_id),
              tech_param_id: getAttr(mod, 'tech_param_id') || getText(mod.tech_param_id),
              configuration_id: getText(mod.configuration_id),
              body_type: getText(mod.body_type),
              engine_volume: parseFloat(getText(mod.engine_volume) || getText(mod.volume)) || null,
              hp: parseInt(getText(mod.hp) || getText(mod.power) || getText(mod.horsepower)) || null,
              transmission: getText(mod.transmission),
              drive_type: getText(mod.drive_type) || getText(mod.drive),
              engine_type: getText(mod.engine_type) || getText(mod.fuel),
              year: parseInt(getText(mod.year)) || null,
              year_from: parseInt(getText(mod.year_from)) || null,
              year_to: parseInt(getText(mod.year_to)) || null,
              price: parseInt(getText(mod.price)) || null
            });
          }
        }
      }
    }
    return records;
  };

  // Обработка плоской структуры: cars > car
  const processFlatStructure = (data) => {
    const root = data.cars || data.catalog || data.data || data;
    let cars = root.car || root.cars || root.item || root.items || root.vehicle || root.vehicles || [];
    if (!Array.isArray(cars)) cars = [cars];

    for (const car of cars) {
      if (!car) continue;
      const markName = getText(car.mark_name) || getText(car.mark) || getText(car.brand);
      if (!markName) continue;

      records.push({
        mark_name: markName,
        mark_code: getText(car.mark_code),
        folder_name: getText(car.folder_name) || getText(car.model),
        folder_id: getText(car.folder_id),
        model_name: getText(car.model_name),
        modification_name: getText(car.modification_name) || getText(car.modification),
        modification_id: getText(car.modification_id),
        tech_param_id: getText(car.tech_param_id),
        configuration_id: getText(car.configuration_id),
        body_type: getText(car.body_type),
        engine_volume: parseFloat(getText(car.engine_volume) || getText(car.volume)) || null,
        hp: parseInt(getText(car.hp) || getText(car.power) || getText(car.horsepower)) || null,
        transmission: getText(car.transmission),
        drive_type: getText(car.drive_type) || getText(car.drive),
        engine_type: getText(car.engine_type) || getText(car.fuel),
        year: parseInt(getText(car.year)) || null,
        year_from: parseInt(getText(car.year_from)) || null,
        year_to: parseInt(getText(car.year_to)) || null,
        price: parseInt(getText(car.price)) || null
      });
    }
    return records;
  };

  // Пробуем обе структуры
  const nestedRecords = processNestedStructure(result);
  if (nestedRecords.length > 0) {
    return nestedRecords;
  }

  return processFlatStructure(result);
}

// ===========================================
// CATALOG UPLOAD (CSV + XML)
// ===========================================

// POST /api/v1/admin/catalog/upload - загрузка каталога CSV/XML (только admin)
app.post('/api/v1/admin/catalog/upload', uploadRateLimiter, authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'NO_FILE', details: 'CSV or XML file required' });
  }

  const startTime = Date.now();
  const filename = req.file.originalname.toLowerCase();
  const isXml = filename.endsWith('.xml');
  const isCsv = filename.endsWith('.csv');

  if (!isXml && !isCsv) {
    return res.status(400).json({ error: 'INVALID_FORMAT', details: 'Only CSV and XML files are supported' });
  }

  try {
    const content = req.file.buffer.toString('utf-8');
    let records = [];

    // Parse file based on format
    if (isCsv) {
      try {
        records = csvParse(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true
        });
      } catch (parseErr) {
        return res.status(400).json({ error: 'PARSE_ERROR', details: `CSV parse error: ${parseErr.message}` });
      }
    } else if (isXml) {
      try {
        records = await parseAutoRuXml(content);
      } catch (parseErr) {
        return res.status(400).json({ error: 'PARSE_ERROR', details: `XML parse error: ${parseErr.message}` });
      }
    }

    if (records.length === 0) {
      return res.status(400).json({ error: 'EMPTY_FILE', details: 'File contains no valid records' });
    }

    // Validate and insert records
    const errors = [];
    const warnings = [];
    let recordsAdded = 0;
    let duplicates = 0;
    const marks = new Set();
    const models = new Set();

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNum = i + 1;

      // Check required field
      if (!row.mark_name || (typeof row.mark_name === 'string' && row.mark_name.trim() === '')) {
        errors.push({ row: rowNum, error: 'Missing required field: mark_name' });
        continue;
      }

      // Prepare car object
      const car = {
        mark_name: typeof row.mark_name === 'string' ? row.mark_name.trim() : row.mark_name,
        mark_code: row.mark_code || null,
        folder_name: row.folder_name || null,
        folder_id: row.folder_id || null,
        model_name: row.model_name || null,
        modification_name: row.modification_name || null,
        modification_id: row.modification_id || null,
        tech_param_id: row.tech_param_id || null,
        configuration_id: row.configuration_id || null,
        body_type: row.body_type || null,
        engine_volume: typeof row.engine_volume === 'number' ? row.engine_volume : (parseFloat(row.engine_volume) || null),
        hp: typeof row.hp === 'number' ? row.hp : (parseInt(row.hp) || null),
        transmission: row.transmission || null,
        drive_type: row.drive_type || null,
        engine_type: row.engine_type || null,
        year: typeof row.year === 'number' ? row.year : (parseInt(row.year) || null),
        year_from: typeof row.year_from === 'number' ? row.year_from : (parseInt(row.year_from) || null),
        year_to: typeof row.year_to === 'number' ? row.year_to : (parseInt(row.year_to) || null),
        price: typeof row.price === 'number' ? row.price : (parseInt(row.price) || null)
      };

      // Insert into database
      try {
        await pool.query(
          `INSERT INTO cars_catalog (mark_name, mark_code, folder_name, folder_id, model_name,
            modification_name, modification_id, tech_param_id, configuration_id, body_type,
            engine_volume, hp, transmission, drive_type, engine_type, year, year_from, year_to, price)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
          [car.mark_name, car.mark_code, car.folder_name, car.folder_id, car.model_name,
           car.modification_name, car.modification_id, car.tech_param_id, car.configuration_id, car.body_type,
           car.engine_volume, car.hp, car.transmission, car.drive_type, car.engine_type,
           car.year, car.year_from, car.year_to, car.price]
        );
        recordsAdded++;
        marks.add(car.mark_name);
        if (car.folder_name) models.add(car.folder_name);
      } catch (dbErr) {
        if (dbErr.code === '23505') { // Unique violation
          duplicates++;
        } else {
          errors.push({ row: rowNum, error: `DB error: ${dbErr.message}` });
        }
      }
    }

    if (duplicates > 0) {
      warnings.push({ type: 'duplicates', count: duplicates });
    }

    const duration = Date.now() - startTime;

    // Audit log
    await logAdminAction(req.user.id, req.user.email, 'upload_catalog', {
      filename: req.file.originalname,
      file_size: req.file.size,
      records_total: records.length,
      records_added: recordsAdded,
      errors_count: errors.length,
      duplicates,
      duration_ms: duration
    }, req);

    res.json({
      success: true,
      records_added: recordsAdded,
      marks_count: marks.size,
      models_count: models.size,
      errors: errors.slice(0, 50), // Limit errors in response
      warnings,
      duration_ms: duration
    });

  } catch (err) {
    console.error('Catalog upload error:', err.message);
    res.status(500).json({ error: 'SERVER_ERROR', details: err.message });
  }
});

// DELETE /api/v1/admin/catalog - очистить каталог (только admin)
app.delete('/api/v1/admin/catalog', adminRateLimiter, authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM cars_catalog');
    const deletedCount = result.rowCount;

    await logAdminAction(req.user.id, req.user.email, 'clear_catalog', {
      deleted_count: deletedCount
    }, req);

    res.json({
      success: true,
      deleted_count: deletedCount
    });
  } catch (err) {
    console.error('Clear catalog error:', err.message);
    res.status(500).json({ error: 'DB_ERROR', details: err.message });
  }
});

// ===========================================
// INIT
// ===========================================
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

  console.log('JWT authentication enabled');
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Backend: http://localhost:${PORT}`);
  console.log(`Parse:   POST http://localhost:${PORT}/api/v1/parse`);
  console.log(`Login:   POST http://localhost:${PORT}/api/v1/admin/auth/login`);
  console.log(`Admin:   GET  http://localhost:${PORT}/api/v1/admin/analytics (JWT)`);
  await init();
});
