# AI Car Finder MVP

ИИ-агент для подбора автомобилей с веб-интерфейсом и административной панелью.

## Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Node.js 20 + Express
- **Database**: PostgreSQL 16
- **LLM**: gpt-4o-mini (OpenAI)
- **Deploy**: Railway / Docker

## Quick Start (Local Development)

```bash
# 1. Clone repository
git clone https://github.com/your-org/ai-car-finder-mvp.git
cd ai-car-finder-mvp

# 2. Copy environment file
cp config/env.example .env

# 3. Start all services
docker-compose up --build

# Services:
# - Frontend: http://localhost:3003
# - Backend:  http://localhost:3002
# - Postgres: localhost:5432
```

## API Endpoints

### Public API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/parse` | Parse query → JSON filters + TOP-5 cars |
| GET | `/api/v1/cars/:id` | Get car details |
| GET | `/health` | Health check |

### Admin API (JWT required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/analytics` | Dashboard metrics |
| GET | `/api/v1/admin/prompts` | Get current prompt config |
| POST | `/api/v1/admin/prompts` | Update prompt (hot reload) |

## Project Structure

```
ai-car-finder-mvp/
├── frontend/          # React + Vite
│   ├── src/
│   │   └── App.jsx    # Main components
│   └── Dockerfile
├── backend/           # Node.js + Express
│   ├── src/
│   │   └── server.js  # API endpoints
│   └── Dockerfile
├── database/          # PostgreSQL
│   └── init.sql       # Schema + seed data
├── config/            # Configuration
│   ├── prompts.yaml   # LLM prompts
│   ├── synonyms.json  # Slang → normalized
│   └── env.example    # Environment template
├── .github/
│   └── workflows/
│       └── deploy.yml # CI/CD pipeline
├── docker-compose.yml
├── railway.toml       # Railway config
└── README.md
```

## Deployment to Railway

### Prerequisites

1. [Railway account](https://railway.app)
2. GitHub repository connected

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
railway env set OPENAI_API_KEY=sk-...
railway env set JWT_SECRET=your-32-char-secret
railway env set NODE_ENV=production

# 6. Deploy (auto-triggered on git push)
git push origin main
```

### Environment Variables (Railway)

```
DATABASE_URL=postgres://... (auto-set by Railway)
OPENAI_API_KEY=sk-proj-...
JWT_SECRET=32-character-secret
NODE_ENV=production
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

# Get car details
curl http://localhost:3002/api/v1/cars/1

# Admin analytics
curl http://localhost:3002/api/v1/admin/analytics
```

## Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Parse Accuracy | >85% | MVP |
| P95 Latency | <2s | MVP |
| LLM Cost | <$0.0001/req | MVP |
| Catalog | 50K records | MVP |

## License

MIT
