// TODO: остальное из architecture.txt
// - TypeScript миграция
// - PostgreSQL + Prisma
// - JWT аутентификация
// - gpt-4o-mini интеграция
// - Rate limiting
// - Логирование в БД

const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Мок-словарь сленга → марки (из architecture.txt)
let SYNONYMS = {
  'бумер': 'BMW', 'bmw': 'BMW', 'бмв': 'BMW',
  'тойота': 'Toyota', 'toyota': 'Toyota',
  'мерс': 'Mercedes-Benz', 'мерседес': 'Mercedes-Benz',
  'ауди': 'Audi', 'audi': 'Audi'
};

// Конфигурация LLM промпта (TODO: PostgreSQL)
let promptConfig = {
  version: 1,
  system_prompt: 'Ты парсер запросов для каталога Auto.ru. Преобразуй текст в JSON фильтры.',
  temperature: 0.1,
  max_tokens: 200,
  updated_at: new Date().toISOString()
};

// Мок-парсер (TODO: заменить на gpt-4o-mini)
function mockParse(query) {
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

  return Object.keys(filters).length >= 1 ? filters : null;
}

// Мок-каталог с полными данными (TODO: PostgreSQL)
// Структура из architecture.txt: mark_name, folder_name, body_type, engine_volume, hp, price
const MOCK_CARS = [
  {
    id: 1,
    mark_name: 'BMW',
    folder_name: 'X5',
    name: 'BMW X5 xDrive30d',
    body_type: 'Внедорожник 5 дв.',
    engine_volume: 3.0,
    hp: 249,
    transmission: 'AT',
    drive_type: '4WD',
    engine_type: 'diesel',
    year: 2019,
    price: 4200000,
    engine: '3.0 Diesel, 249 hp'
  },
  {
    id: 2,
    mark_name: 'BMW',
    folder_name: 'X5',
    name: 'BMW X5 xDrive40i',
    body_type: 'Внедорожник 5 дв.',
    engine_volume: 3.0,
    hp: 340,
    transmission: 'AT',
    drive_type: '4WD',
    engine_type: 'gasoline',
    year: 2020,
    price: 4800000,
    engine: '3.0 Petrol, 340 hp'
  },
  {
    id: 3,
    mark_name: 'Toyota',
    folder_name: 'RAV4',
    name: 'Toyota RAV4',
    body_type: 'Внедорожник 5 дв.',
    engine_volume: 2.0,
    hp: 150,
    transmission: 'CVT',
    drive_type: 'FWD',
    engine_type: 'gasoline',
    year: 2021,
    price: 2500000,
    engine: '2.0 Petrol, 150 hp'
  }
];

// POST /api/v1/parse - основной endpoint из architecture.txt
app.post('/api/v1/parse', (req, res) => {
  const { query } = req.body;

  if (!query || query.length < 2) {
    return res.status(400).json({ error: 'INVALID_QUERY', details: 'Query too short' });
  }

  const startTime = Date.now();
  const filters = mockParse(query);

  // Поиск в мок-каталоге по всем фильтрам
  let results = null;
  if (filters) {
    results = MOCK_CARS.filter(car => {
      if (filters.mark_name && !car.mark_name.toLowerCase().includes(filters.mark_name.toLowerCase())) return false;
      if (filters.folder_name && !car.folder_name.toLowerCase().includes(filters.folder_name.toLowerCase())) return false;
      if (filters.engine_type && car.engine_type !== filters.engine_type) return false;
      if (filters.engine_volume_min && car.engine_volume < filters.engine_volume_min) return false;
      return true;
    }).slice(0, 5);
  }

  // Сбор статистики для /admin/analytics
  stats.today_requests++;
  if (filters) {
    stats.successful_parses++;
    if (filters.mark_name) {
      stats.brand_counts[filters.mark_name] = (stats.brand_counts[filters.mark_name] || 0) + 1;
    }
  }

  res.json({
    success: filters !== null,
    catalog_status: 'loaded',
    filters,
    results,
    metrics: {
      parsing_method: 'mock', // TODO: 'llm'
      latency_ms: Date.now() - startTime,
      cost_usd: 0.00006
    }
  });
});

// GET /api/v1/cars/:id - детали машины (из architecture.txt)
app.get('/api/v1/cars/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const car = MOCK_CARS.find(c => c.id === id);

  if (!car) {
    return res.status(404).json({ error: 'NOT_FOUND', details: `Car ${id} not found` });
  }

  // Формат ответа из architecture.txt
  res.json({
    id: car.id,
    mark_name: car.mark_name,
    folder_name: car.folder_name,
    body_type: car.body_type,
    engine_volume: car.engine_volume,
    hp: car.hp,
    transmission: car.transmission,
    drive_type: car.drive_type,
    engine_type: car.engine_type,
    year: car.year,
    price: car.price
  });
});

// Мок-статистика запросов (TODO: PostgreSQL + реальные логи)
const stats = {
  today_requests: 0,
  successful_parses: 0,
  brand_counts: {}
};

// GET /api/v1/admin/analytics - дашборд из architecture.txt
app.get('/api/v1/admin/analytics', (req, res) => {
  // TODO: JWT аутентификация
  const accuracy = stats.today_requests > 0
    ? (stats.successful_parses / stats.today_requests)
    : 0;

  const top_brands = Object.entries(stats.brand_counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count, share: stats.today_requests > 0 ? count / stats.today_requests : 0 }));

  res.json({
    today: {
      requests: stats.today_requests,
      parsing_accuracy: Math.round(accuracy * 1000) / 1000,
      llm_cost_usd: stats.today_requests * 0.00006
    },
    top_brands,
    catalog: {
      total_records: MOCK_CARS.length,
      last_updated: new Date().toISOString()
    }
  });
});

// GET /api/v1/admin/prompts - получить текущий промпт
app.get('/api/v1/admin/prompts', (req, res) => {
  // TODO: JWT аутентификация
  res.json({
    ...promptConfig,
    synonyms: SYNONYMS
  });
});

// POST /api/v1/admin/prompts - обновить промпт (hot reload) из architecture.txt
app.post('/api/v1/admin/prompts', (req, res) => {
  // TODO: JWT аутентификация
  const { system_prompt, temperature, max_tokens, synonyms } = req.body;

  const previousVersion = promptConfig.version;

  if (system_prompt) promptConfig.system_prompt = system_prompt;
  if (temperature !== undefined) promptConfig.temperature = temperature;
  if (max_tokens !== undefined) promptConfig.max_tokens = max_tokens;
  if (synonyms) SYNONYMS = { ...SYNONYMS, ...synonyms };

  promptConfig.version++;
  promptConfig.updated_at = new Date().toISOString();

  res.json({
    status: 'reloaded',
    previous_version: previousVersion,
    current_version: promptConfig.version,
    updated_at: promptConfig.updated_at
  });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', catalog_status: 'loaded', catalog_size: MOCK_CARS.length });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend: http://localhost:${PORT}`);
  console.log(`Parse:   POST http://localhost:${PORT}/api/v1/parse`);
  console.log(`Car:     GET  http://localhost:${PORT}/api/v1/cars/:id`);
  console.log(`Admin:   GET  http://localhost:${PORT}/api/v1/admin/analytics`);
  console.log(`Prompts: POST http://localhost:${PORT}/api/v1/admin/prompts`);
});
