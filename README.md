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

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js 20 + Express
- **Database**: PostgreSQL 16
- **LLM**: OpenRouter (DeepSeek Chat)
- **Deploy**: Railway / Docker

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

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/parse` | Parse query → JSON filters + TOP-5 cars |
| GET | `/api/v1/cars/:id` | Get car details |
| GET | `/health` | Health check |

### Auth API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/admin/auth/login` | Login → JWT token |
| GET | `/api/v1/admin/auth/me` | Verify token |

### Admin API (JWT required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/analytics` | Dashboard metrics |
| GET | `/api/v1/admin/prompts` | Get prompt config |
| POST | `/api/v1/admin/prompts` | Update prompt (hot reload) |
| GET | `/api/v1/admin/audit` | Audit log |
| POST | `/api/v1/admin/catalog/upload` | Upload CSV/XML catalog |
| DELETE | `/api/v1/admin/catalog` | Clear catalog |
| GET | `/api/v1/admin/errors` | Error graveyard |
| POST | `/api/v1/admin/errors/:id/resolve` | Mark error resolved |
| DELETE | `/api/v1/admin/errors/:id` | Delete error entry |

## Project Structure

```
ai-car-finder-mvp/
├── frontend/          # React + Vite
│   ├── src/
│   │   ├── App.jsx    # Main components
│   │   └── App.css    # Styles
│   └── Dockerfile
├── backend/           # Node.js + Express
│   ├── src/
│   │   └── server.js  # API endpoints
│   └── Dockerfile
├── database/          # PostgreSQL
│   └── init.sql       # Schema + seed data
├── config/            # Configuration
│   └── env.example    # Environment template
├── .github/
│   └── workflows/
│       └── deploy.yml # CI/CD pipeline
├── docker-compose.yml
└── README.md
```

## Environment Variables

```bash
# Database (auto-set by Railway for production)
DATABASE_URL=postgres://user:password@host:5432/db

# LLM (OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-...
LLM_MODEL=deepseek/deepseek-chat
LLM_TEMPERATURE=0.1
LLM_MAX_TOKENS=200

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

## Deployment to Railway

### Prerequisites

1. [Railway account](https://railway.app)
2. GitHub repository connected
3. [OpenRouter API key](https://openrouter.ai)

### Deploy Steps

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Link project
railway link

# 4. Add PostgreSQL
railway add postgres

# 5. Set environment variables
railway variables set OPENROUTER_API_KEY=sk-or-v1-...
railway variables set JWT_SECRET=your-32-char-secret
railway variables set NODE_ENV=production

# 6. Initialize database (run init.sql)
railway run psql < database/init.sql

# 7. Deploy (auto-triggered on git push)
git push origin main
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

| Metric | Target | Status |
|--------|--------|--------|
| Parse Accuracy | >85% | ✅ MVP |
| P95 Latency | <2s | ✅ MVP |
| LLM Cost | <$0.001/req | ✅ MVP |
| Catalog | 50K records | ✅ MVP |
| Rate Limiting | 100/min | ✅ MVP |

## License

MIT
