# AI Car Finder MVP

ИИ-агент для подбора автомобилей с веб-интерфейсом и административной панелью.

## Возможности

### Пользователь

- Поиск автомобилей на естественном языке ("бумер x5 дизель до 5 млн")
- LLM-парсинг запросов в JSON-фильтры
- Просмотр TOP-5 результатов с деталями
- История последних 10 запросов (localStorage)

### Администратор

- JWT-авторизация (логин/пароль)
- Дашборд с метриками (запросы, точность, стоимость LLM)
- Загрузка каталога CSV/XML (формат Auto.ru)
- Редактор промптов с hot reload
- Управление синонимами (сленг → марка)
- "Кладбище ошибок" - отслеживание проблемных запросов
- Аудит лог действий

### Защита

- Rate limiting (100 req/min user, 50 req/min admin)
- JWT токены (24h expiry)
- Валидация входных данных
- **Мультиагентная система безопасности** (см. ниже)

## Мультиагентная архитектура

Система использует несколько специализированных LLM-агентов:

```
Запрос пользователя
         │
         ▼
┌─────────────────────────┐
│  🛡️ Security Agent      │  ← Проверяет безопасность
│  - Prompt injection     │
│  - Off-topic запросы    │
│  - Toxic контент        │
└───────────┬─────────────┘
            │ safe ✓
            ▼
┌─────────────────────────┐
│  🔍 Parser Agent        │  ← Извлекает фильтры
│  - Понимает сленг       │
│  - JSON фильтры         │
└───────────┬─────────────┘
            │
            ▼
       Результаты
```

### Конфигурация агентов

Файл: `backend/src/config/agents.js`

```javascript
module.exports = {
  security: {
    enabled: true,
    model: process.env.SECURITY_AGENT_MODEL || "deepseek/deepseek-chat",
    // Рекомендуется: 'anthropic/claude-3-haiku' (быстрее, дешевле)
  },
  parser: {
    model: process.env.PARSER_AGENT_MODEL || "deepseek/deepseek-chat",
  },
};
```

### Смена модели агента

```bash
# В Railway или .env:
SECURITY_AGENT_MODEL=anthropic/claude-3-haiku
PARSER_AGENT_MODEL=openai/gpt-4o-mini
```

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js 20 + Express
- **Database**: PostgreSQL 16
- **LLM**: OpenRouter (DeepSeek Chat)
- **Deploy**: Fly.io / Docker

## Quick Start (Local Development)

```bash
# 1. Clone repository
git clone https://github.com/LENA-EE/ai-car-finder-mvp.git
cd ai-car-finder-mvp

# 2. Copy environment file
cp config/env.example .env

# 3. Add your OpenRouter API key to .env
# OPENROUTER_API_KEY=sk-or-v1-...

# 4. Start all services
docker-compose up --build

# Services:
# - Frontend: http://localhost:3003
# - Backend:  http://localhost:3002
# - Postgres: localhost:5432
```

### Логин в админку

- **Email**: admin@ai-car-finder.app
- **Пароль**: admin123

## API Endpoints

### Public API

| Method | Endpoint           | Description                             |
| ------ | ------------------ | --------------------------------------- |
| POST   | `/api/v1/parse`    | Parse query → JSON filters + TOP-5 cars |
| GET    | `/api/v1/cars/:id` | Get car details                         |
| GET    | `/health`          | Health check                            |

### Auth API

| Method | Endpoint                   | Description       |
| ------ | -------------------------- | ----------------- |
| POST   | `/api/v1/admin/auth/login` | Login → JWT token |
| GET    | `/api/v1/admin/auth/me`    | Verify token      |

### Admin API (JWT required)

| Method | Endpoint                           | Description                |
| ------ | ---------------------------------- | -------------------------- |
| GET    | `/api/v1/admin/analytics`          | Dashboard metrics          |
| GET    | `/api/v1/admin/prompts`            | Get prompt config          |
| POST   | `/api/v1/admin/prompts`            | Update prompt (hot reload) |
| GET    | `/api/v1/admin/audit`              | Audit log                  |
| POST   | `/api/v1/admin/catalog/upload`     | Upload CSV/XML catalog     |
| DELETE | `/api/v1/admin/catalog`            | Clear catalog              |
| GET    | `/api/v1/admin/errors`             | Error graveyard            |
| POST   | `/api/v1/admin/errors/:id/resolve` | Mark error resolved        |
| DELETE | `/api/v1/admin/errors/:id`         | Delete error entry         |

## Project Structure

```
ai-car-finder-mvp/
├── frontend/                    # React + Vite (FSD architecture)
│   └── src/
│       ├── app/                 # App setup
│       ├── pages/               # Page components
│       ├── features/            # Feature modules
│       ├── entities/            # Domain entities
│       ├── shared/              # Shared utilities
│       └── widgets/             # UI widgets
├── backend/                     # Node.js + Express
│   └── src/
│       ├── config/              # Configuration
│       │   └── agents.js        # 🆕 Multi-agent config
│       ├── controllers/         # Route handlers
│       ├── services/
│       │   ├── agents/          # 🆕 LLM Agents
│       │   │   ├── security.agent.js  # Security validation
│       │   │   └── index.js
│       │   ├── parsing/         # Query parsing
│       │   └── search/          # DB search
│       ├── repositories/        # Database access
│       └── middleware/          # Express middleware
├── database/
│   └── init.sql                 # Schema + seed data
├── config/
│   └── env.example              # Environment template
├── docker-compose.yml
└── README.md
```

## Environment Variables

```bash
# Database (auto-set by Railway for production)
DATABASE_URL=postgres://user:password@host:5432/db

# LLM (OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-...

# Multi-Agent Models (optional, defaults to deepseek)
SECURITY_AGENT_MODEL=deepseek/deepseek-chat   # or anthropic/claude-3-haiku
PARSER_AGENT_MODEL=deepseek/deepseek-chat     # or openai/gpt-4o-mini

# Authentication
JWT_SECRET=your-32-character-secret-here
JWT_EXPIRES_IN=24h

# Admin credentials (for init.sql)
ADMIN_EMAIL=admin@ai-car-finder.app
ADMIN_PASSWORD=admin123

# Server
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.app

# Rate Limiting
RATE_LIMIT_USER=100
RATE_LIMIT_ADMIN=50
```

## Deployment to Render (Free Tier)

### Production URLs

| Service  | URL                                              |
| -------- | ------------------------------------------------ |
| Frontend | https://ai-car-finder-mvp.onrender.com           |
| Backend  | https://ai-car-finder-backend.onrender.com       |
| Health   | https://ai-car-finder-backend.onrender.com/health |

### ⚠️ Пробуждение Backend (Free Tier)

На бесплатном тарифе Render backend **засыпает после 15 минут** неактивности.

**Перед использованием открой в браузере:**
```
https://ai-car-finder-backend.onrender.com/health
```

Подожди ~30 сек пока появится `{"status":"healthy"...}` — backend проснулся, можно работать.

### Логин в админку

- URL: https://ai-car-finder-mvp.onrender.com/admin
- **Email**: admin@ai-car-finder.app
- **Пароль**: admin123

---

## Deployment to Fly.io

### Prerequisites

1. [Fly.io account](https://fly.io)
2. [OpenRouter API key](https://openrouter.ai)

### Deploy Steps

```bash
# 1. Install Fly CLI
# Windows: pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
# Or: npm install -g flyctl

# 2. Login
fly auth login

# 3. Create PostgreSQL (free tier: 1GB)
fly postgres create --name ai-car-finder-db --region ams

# 4. Deploy Backend
cd backend
fly launch --no-deploy --name ai-car-finder-backend --region ams
fly postgres attach ai-car-finder-db --app ai-car-finder-backend
fly secrets set JWT_SECRET="your-32-char-secret" OPENROUTER_API_KEY="sk-or-v1-..."
fly deploy

# 5. Initialize database
fly proxy 5433:5432 -a ai-car-finder-db
# In another terminal:
psql postgres://postgres:PASSWORD@localhost:5433/ai_car_finder -f database/init.sql

# 6. Deploy Frontend
cd frontend
fly launch --no-deploy --name ai-car-finder-frontend --region ams
fly deploy
```

### Production URLs

| Service  | URL                                      |
| -------- | ---------------------------------------- |
| Frontend | https://ai-car-finder-frontend.fly.dev   |
| Backend  | https://ai-car-finder-backend.fly.dev    |
| Health   | https://ai-car-finder-backend.fly.dev/health |

### Useful Commands

```bash
fly status -a ai-car-finder-backend     # Check status
fly logs -a ai-car-finder-backend       # View logs
fly postgres connect -a ai-car-finder-db # DB console
```

## Development

### Backend only

```bash
cd backend
npm install
npm run dev
```

### Frontend only

```bash
cd frontend
npm install
npm run dev
```

### With Docker

```bash
docker-compose up --build
```

## Testing

```bash
# Health check
curl http://localhost:3002/health

# Parse query
curl -X POST http://localhost:3002/api/v1/parse \
  -H "Content-Type: application/json" \
  -d '{"query": "bmw x5 diesel"}'

# Login
curl -X POST http://localhost:3002/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@ai-car-finder.app", "password": "admin123"}'

# Admin analytics (with JWT)
curl http://localhost:3002/api/v1/admin/analytics \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Catalog Upload

### CSV Format

```csv
mark_name,folder_name,body_type,engine_volume,hp,transmission,drive_type,engine_type,year,price
BMW,X5,Внедорожник 5 дв.,3.0,249,AT,4WD,diesel,2019,4200000
```

### XML Format (Auto.ru)

```xml
<catalog>
  <mark name="BMW" code="BMW">
    <folder name="X5" id="x5001">
      <modification id="mod001" tech_param_id="tp001">
        <body_type>Внедорожник 5 дв.</body_type>
        <engine_volume>3.0</engine_volume>
        <hp>249</hp>
        <transmission>AT</transmission>
        <drive_type>4WD</drive_type>
        <engine_type>diesel</engine_type>
        <year_from>2019</year_from>
        <price>4200000</price>
      </modification>
    </folder>
  </mark>
</catalog>
```

## Metrics

| Metric         | Target      | Status |
| -------------- | ----------- | ------ |
| Parse Accuracy | >85%        | ✅ MVP |
| P95 Latency    | <2s         | ✅ MVP |
| LLM Cost       | <$0.001/req | ✅ MVP |
| Catalog        | 50K records | ✅ MVP |
| Rate Limiting  | 100/min     | ✅ MVP |

## License

MIT
Фича: Обогащение результатов поиска стоимостью обслуживания

ПРОБЛЕМА:
Пользователи видят цену покупки автомобиля, но не понимают реальную
стоимость владения. Два автомобиля по одной цене могут различаться
в 2-3 раза по расходам на обслуживание.

РЕШЕНИЕ:
После нахождения подходящих автомобилей система автоматически
добавляет информацию:

- Средняя годовая стоимость обслуживания (ТО, запчасти)
- Стоимость обслуживания на километр пробега
- Источник данных для прозрачности

USER STORY:
Как пользователь, я хочу видеть не только цену покупки, но и расходы
на содержание автомобиля, чтобы принять обоснованное решение.

Пример:
Запрос: "бумер x5 дизель до 5 млн"
Результат:
BMW X5 3.0d 2019 - 4 200 000 ₽
└─ Обслуживание: ~180 000 ₽/год (~12 ₽/км)
Источник: auto.dev

КРИТЕРИИ ПРИЁМКИ:

1. Для каждого найденного авто показывается стоимость обслуживания
2. Если данных нет для конкретного авто - показываем авто БЕЗ этой инфы
3. Если внешний API недоступен - пользователь всё равно получает
   результаты поиска (не ломаем основную функцию)
4. Время ответа увеличивается не более чем на 1-2 секунды
5. Указываем источник данных (auto.dev)

ГРАНИЧНЫЕ СЛУЧАИ:

- Внешний API недоступен → показываем результаты без обогащения
- API возвращает ошибку для конкретного авто → показываем авто без стоимости обслуживания
- API медленный (>3 сек) → прерываем запрос, возвращаем результаты без обогащения
- Нет данных для редкого авто → показываем "Данные недоступны"

НЕ ВХОДИТ В ТЕКУЩУЮ ВЕРСИЮ:

- Проверка наличия у дилеров
- Геолокация пользователя
- Страховые расходы
- Стоимость топлива
- История ремонтов конкретного VIN

БУДУЩИЕ ЭТАПЫ:

1. Интеграция с базой дилеров (и цены)
2. Учёт геолокации для поиска ближайших дилеров
3. Калькулятор полной стоимости владения (TCO)
