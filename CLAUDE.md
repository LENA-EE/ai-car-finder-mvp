# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Car Finder MVP - a multi-agent LLM system for natural language car search. Users can query in Russian slang (e.g., "бумер x5 дизель до 5 млн") and get matching cars from a PostgreSQL catalog.

### Key Features (2026)

- **Multi-Agent Pipeline**: Security validation → LLM parsing → Database search
- **Russian Slang Support**: Understands "бумер", "гелик", "тачка" via synonyms table
- **Post-Search Filter Chips**: Dynamic client-side filters for instant result refinement
  - 5 filter groups: engine, transmission, drive, body, year
  - Faceted counts, AND/OR logic, disabled chips for impossible combinations
  - No backend calls - instant filtering

### Deployment

- **Hosting**: Fly.io (free tier)
- **Backend**: `ai-car-finder-backend.fly.dev`
- **Frontend**: `ai-car-finder-frontend.fly.dev`
- **Database**: Fly Postgres with pgvector support (planned)
- **Config files**: `backend/fly.toml`, `frontend/fly.toml`

## Build & Development Commands

### Backend (Node.js + Express)

```bash
cd backend
npm install
npm run dev       # Development with --watch
npm start         # Production
```

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev       # Development with HMR
npm run build     # Production build
npm run lint      # ESLint
```

### Docker (Full Stack)

```bash
docker-compose up --build      # Start all services
docker-compose down            # Stop all
```

### Fly.io Deployment

```bash
cd backend && fly deploy       # Deploy backend
cd frontend && fly deploy      # Deploy frontend
fly logs -a ai-car-finder-backend  # View logs
fly postgres connect -a ai-car-finder-db  # DB console
```

### Testing

```bash
./smoke-tests.sh               # Smoke tests (health, parse, auth endpoints)

# Manual API tests
curl http://localhost:3002/health
curl -X POST http://localhost:3002/api/v1/parse \
  -H "Content-Type: application/json" \
  -d '{"query": "bmw x5 diesel"}'
```

## Architecture

### Multi-Agent System

The core innovation is a pipeline of specialized LLM agents:

```
User Query → [Security Agent] → [Parser Agent] → [DB Search] → Results
```

1. **Security Agent** (`backend/src/services/agents/security.agent.js`): Validates query safety (injection, off-topic, toxic content). Uses LLM with regex fallback.

2. **Parser Agent** (`backend/src/services/parsing/llm.service.js`): Converts natural language to JSON filters using few-shot learning. Understands Russian car slang via synonyms table.

Agent models are configurable via env vars: `SECURITY_AGENT_MODEL`, `PARSER_AGENT_MODEL`.

### Backend Layers

- **Controllers** (`backend/src/controllers/`): Route handlers. `parse.controller.js` orchestrates the full request flow.
- **Services** (`backend/src/services/`): Business logic. Agents, parsing, search, auth.
- **Repositories** (`backend/src/repositories/`): Database queries. All SQL isolated here.
- **Config** (`backend/src/config/`): Database pool, JWT, rate limits, agent config.

### Frontend (FSD Architecture)

- **pages/**: `UserSearchPage.jsx` (main search), `AdminDashboard.jsx` (admin panel)
- **features/**: auth, search, catalog, analytics, errors
- **entities/**: car, error, user domain objects
- **shared/**: API client, hooks, utilities

### Key Configuration Files

| File                                       | Purpose                       |
| ------------------------------------------ | ----------------------------- |
| `backend/src/config/agents.js`             | LLM agent model selection     |
| `backend/src/constants/defaultPrompt.js`   | Parser agent system prompt    |
| `backend/src/constants/fewShotExamples.js` | Few-shot examples for parsing |
| `database/init.sql`                        | Schema (9 tables) + seed data |

## Database

PostgreSQL 16 with these key tables:

- `cars`: Vehicle catalog (supports 50K+ records)
- `parse_sessions`: Request logging with metrics
- `prompts`: Hot-reloadable prompt versions
- `synonyms`: Slang mappings (бумер → BMW)
- `error_graveyard`: Failed query tracking
- `audit_log`: Admin action history

## API Structure

- **Public**: `POST /api/v1/parse`, `GET /api/v1/cars/:id`, `GET /health`
- **Auth**: `POST /api/v1/admin/auth/login`, `GET /api/v1/admin/auth/me`
- **Admin** (JWT required): `/api/v1/admin/analytics`, `/api/v1/admin/prompts`, `/api/v1/admin/catalog/upload`, `/api/v1/admin/errors`

## Key Patterns

- **LLM Fallback Chain**: LLM parser → keyword parser → regex (graceful degradation)
- **Hot-Reload Config**: Prompts stored in DB, editable without restart
- **Error Graveyard**: Failed queries logged for iterative improvement
- **Rate Limiting**: 100 req/min users, 50 req/min admins

## Environment Variables

Required:

- `DATABASE_URL`: PostgreSQL connection string
- `OPENROUTER_API_KEY`: LLM API access
- `JWT_SECRET`: Auth token signing (32+ chars)

Optional:

- `SECURITY_AGENT_MODEL`, `PARSER_AGENT_MODEL`: Override default `deepseek/deepseek-chat`
- `RATE_LIMIT_USER`, `RATE_LIMIT_ADMIN`: Custom rate limits

## Admin Access

Default credentials: `admin@ai-car-finder.app` / `admin123`

## Rules for Claude

- Всегда читай этот файл перед сложными изменениями.
- Не меняй:
  - миграции и `database/init.sql` без явного запроса;
  - маршруты API и контракты ответа без комментария.
    Никогда не меняй файл без моего разрешения architecture.txt, структураФайлаАвтоРу.txt и примеры промптов
- При правках:
  - сначала опиши план изменений списком;
  - затем показывай только изменённые файлы/фрагменты;
  - по возможности добавляй/обновляй тесты.
- Если не уверен в бизнес-логике — задавай уточняющие вопросы вместо догадок.
