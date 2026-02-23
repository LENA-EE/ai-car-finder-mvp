# Car Tools API — Спецификация

## Обзор

**Car Tools API** — универсальный сервис инструментов для AI-агентов. Предоставляет набор tools (инструментов), которые любой LLM может вызывать для поиска автомобилей и проверки VIN.

### Проблема

Сейчас логика инструментов (search, VIN check) находится внутри проекта `ai-car-finder-mvp`. Это не позволяет:
- Переиспользовать инструменты в других проектах (телеграм-бот, другие сайты)
- Давать доступ к инструментам другим разработчикам
- Подключать к Claude Desktop через MCP

### Решение

Вынести инструменты в отдельный сервис с HTTP API:

```
┌─────────────────────────────────────────────────────┐
│               Car Tools API                         │
│         https://car-tools-api.onrender.com          │
│                                                     │
│  GET  /tools           → список инструментов        │
│  POST /tools/execute   → вызов инструмента          │
│  GET  /health          → статус сервиса             │
└─────────────────────────────────────────────────────┘
          ▲           ▲           ▲           ▲
          │           │           │           │
    ┌─────┴───┐ ┌─────┴───┐ ┌─────┴───┐ ┌─────┴───┐
    │ ai-car- │ │ Telegram│ │ Другой  │ │ Claude  │
    │ finder  │ │ Bot     │ │ проект  │ │ Desktop │
    └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

## Инструменты (Tools)

### 1. search_cars
Поиск автомобилей в каталоге по параметрам.

**Параметры:**
- `mark_name` (string) — марка (BMW, Toyota...)
- `folder_name` (string) — модель (X5, RAV4...)
- `body_type` (string) — тип кузова
- `engine_type` (enum) — diesel, petrol, hybrid, electric
- `transmission` (enum) — AT, MT, CVT, AMT
- `drive_type` (enum) — 4WD, FWD, RWD
- `price_min`, `price_max` (number) — цена в рублях
- `year_from`, `year_to` (integer) — год выпуска
- `limit` (integer) — количество результатов (default: 5)

**Возвращает:** массив машин с характеристиками

### 2. check_vin
Полная проверка автомобиля по VIN номеру.

**Параметры:**
- `vin` (string, required) — VIN номер (17 символов)

**Возвращает:**
- Расшифровка (марка, модель, год, страна)
- Залоги (ФНП)
- ДТП, ограничения (ГИБДД)
- Статус: ok / warning / danger

### 3. decode_vin
Расшифровка VIN номера (без проверки истории).

**Параметры:**
- `vin` (string, required) — VIN номер

**Возвращает:** марка, модель, год, страна, двигатель, тип кузова

### 4. semantic_search
Семантический поиск по описанию ("надёжная семейная машина").

**Параметры:**
- `query` (string, required) — описание
- `limit` (integer) — количество результатов

**Возвращает:** массив машин с similarity score

### 5. get_model_info
Информация о модели (болячки, обслуживание).

**Параметры:**
- `brand` (string, required) — марка
- `model` (string, required) — модель
- `year_from`, `year_to` (integer) — поколение

**Возвращает:** структура для AI (он наполнит из своих знаний)

### 6. compare_models
Сравнение двух моделей.

**Параметры:**
- `model1` (object) — {brand, model}
- `model2` (object) — {brand, model}

**Возвращает:** структура для сравнения

## API Endpoints

### GET /tools
Возвращает список доступных инструментов в формате OpenAI function calling.

```json
{
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_cars",
        "description": "Поиск автомобилей...",
        "parameters": {...}
      }
    }
  ]
}
```

### POST /tools/execute
Выполняет инструмент.

**Request:**
```json
{
  "tool": "search_cars",
  "args": {
    "mark_name": "Toyota",
    "price_max": 2000000
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "total": 15,
    "cars": [...]
  }
}
```

### GET /health
Статус сервиса.

## Технологии

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Database:** PostgreSQL (Neon) — та же база что у ai-car-finder
- **External APIs:** NHTSA, ФНП
- **Deploy:** Render

## Структура проекта

```
car-tools-api/
├── src/
│   ├── tools/
│   │   ├── definitions.js    # Описания инструментов (OpenAI format)
│   │   ├── search.tool.js    # Логика search_cars
│   │   ├── vin.tool.js       # Логика check_vin, decode_vin
│   │   ├── semantic.tool.js  # Логика semantic_search
│   │   └── index.js          # Экспорт всех tools
│   ├── services/
│   │   ├── database.js       # PostgreSQL connection
│   │   ├── nhtsa.service.js  # NHTSA API
│   │   ├── fnp.service.js    # ФНП API
│   │   └── gibdd.service.js  # ГИБДД (заглушка)
│   ├── routes/
│   │   └── tools.routes.js   # API routes
│   ├── middleware/
│   │   └── auth.js           # API key auth (опционально)
│   └── index.js              # Entry point
├── mcp/
│   └── index.js              # MCP адаптер для Claude Desktop
├── package.json
├── render.yaml
├── .env.example
└── README.md
```

## Безопасность

### API Key (опционально)
Для публичного доступа можно добавить API key:

```
POST /tools/execute
Headers:
  X-API-Key: xxx
```

### Rate Limiting
- 100 запросов/минуту на IP
- 1000 запросов/минуту на API key

## Интеграция с клиентами

### 1. ai-car-finder-mvp (веб-сайт)
Заменить локальные tools на вызовы API:

```javascript
// Было (локально)
const result = await executeTool('search_cars', args);

// Стало (через API)
const result = await fetch('https://car-tools-api.onrender.com/tools/execute', {
  method: 'POST',
  body: JSON.stringify({ tool: 'search_cars', args })
});
```

### 2. Telegram Bot
```javascript
// Получаем tools для LLM
const { tools } = await fetch('/tools').then(r => r.json());

// Передаём в OpenAI/DeepSeek
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [...],
  tools: tools,
});

// Если LLM хочет вызвать tool
if (response.tool_calls) {
  const result = await fetch('/tools/execute', {
    body: JSON.stringify({ tool: toolName, args })
  });
}
```

### 3. Claude Desktop (MCP)
Конфиг `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "car-tools": {
      "command": "node",
      "args": ["/path/to/car-tools-api/mcp/index.js"]
    }
  }
}
```

## Миграция

### Фаза 1: Создание сервиса
1. Создать репозиторий `car-tools-api`
2. Перенести tools из ai-car-finder-mvp
3. Настроить API endpoints
4. Деплой на Render

### Фаза 2: Интеграция
1. ai-car-finder-mvp подключается к API
2. Удалить локальные tools из ai-car-finder-mvp

### Фаза 3: Расширение
1. Telegram bot
2. MCP для Claude Desktop
3. Документация для внешних разработчиков

## Переменные окружения

```env
DATABASE_URL=postgresql://...      # Neon PostgreSQL
FNP_MOCK=true                      # Mock ФНП для тестов
API_KEY=optional-api-key           # Опциональная защита
PORT=3001                          # Порт (default: 3001)
```

## Метрики успеха

- [ ] API отвечает на /health
- [ ] Все 6 инструментов работают
- [ ] ai-car-finder-mvp использует API вместо локальных tools
- [ ] Документация для интеграции
