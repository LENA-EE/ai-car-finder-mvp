# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Car Finder MVP - интеллектуальный помощник для поиска автомобилей с AI-агентом и Tool Use.

### Ключевые особенности

- **AI Agent с Tool Use**: Агент сам решает какие инструменты вызывать (search, VIN check, etc.)
- **Два режима чата**: "Быстрый подбор" (кратко) и "Живое общение" (дружелюбно, с эмодзи)
- **Russian Slang Support**: Понимает "бумер", "мерс", "тачка до 2 лямов"
- **Semantic Search**: pgvector для абстрактных запросов ("надёжная семейная машина")
- **VIN Decoder & Checker**: Расшифровка и проверка по базам (ФНП, ГИБДД)

### Архитектура AI Agent

```
Пользователь: "Найди кроссовер до 2 млн и проверь VIN"
                    │
                    ▼
┌─────────────────────────────────────────────────────┐
│                   AI Agent                          │
│   DeepSeek с Tool Use (function calling)            │
│                                                     │
│   Доступные инструменты:                            │
│   • search_cars      — поиск по параметрам          │
│   • check_vin        — полная проверка VIN          │
│   • decode_vin       — расшифровка VIN              │
│   • semantic_search  — поиск по описанию            │
│   • get_model_info   — болячки, обслуживание        │
│   • compare_models   — сравнение моделей            │
│                                                     │
│   AI сам выбирает какие tools вызвать!              │
└─────────────────────────────────────────────────────┘
                    │
                    ▼
            Человечный ответ
```

### Deployment

- **Hosting**: Render
- **Backend**: `ai-car-finder-backend.onrender.com`
- **Frontend**: `ai-car-finder-frontend.onrender.com`
- **Database**: Neon PostgreSQL with pgvector
- **Config file**: `render.yaml`

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

### Testing

```bash
# Manual API tests
curl http://localhost:3000/health

# Test chat API
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Найди кроссовер до 2 млн", "mode": "friendly"}'
```

## Project Structure

```
ai-car-finder-mvp/
├── backend/
│   └── src/
│       ├── services/
│       │   ├── agent/           # NEW: AI Agent с Tool Use
│       │   │   ├── index.js     # Главный агент
│       │   │   ├── tools.js     # Описания инструментов
│       │   │   └── executor.js  # Исполнитель tools
│       │   ├── chat/            # Chat service (использует agent)
│       │   ├── vin/             # VIN decoder & checker
│       │   │   ├── decoder.service.js
│       │   │   ├── checker.service.js
│       │   │   ├── fnp.service.js    # ФНП (залоги)
│       │   │   └── nhtsa.service.js  # NHTSA API
│       │   ├── search/          # Поиск машин
│       │   │   ├── cars.service.js
│       │   │   └── semantic.service.js
│       │   ├── parsing/         # Парсинг запросов
│       │   └── embeddings/      # Векторные представления
│       ├── controllers/
│       ├── routes/
│       └── config/
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── ChatPage/        # Главная страница с чатом
│       │   └── VinPage/         # VIN-проверка
│       ├── features/
│       │   └── chat/            # Chat UI с toggle режимов
│       └── widgets/
│           └── Navigation/      # [Чат] [VIN-проверка] [Админ]...
├── specs/
│   ├── 1-vin-decoder/           # Спецификация VIN Decoder
│   └── 2-tools-api/             # Спецификация Car Tools API (планируется)
└── database/
    └── migrations/
```

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/services/agent/index.js` | AI Agent с Tool Use |
| `backend/src/services/agent/tools.js` | Описания инструментов |
| `backend/src/services/agent/executor.js` | Исполнитель tools |
| `backend/src/services/chat/chat.service.js` | Chat orchestrator |
| `frontend/src/features/chat/ui/Chat.jsx` | Chat UI с toggle режимов |

## API Endpoints

### Chat API
```
POST /api/v1/chat
Body: {
  "message": "Найди кроссовер до 2 млн",
  "history": [],
  "mode": "friendly"  // или "quick"
}

Response: {
  "message": "Нашёл 15 вариантов...",
  "cars": [...],
  "vinResult": null,
  "suggestions": ["Показать ещё", "Только дизель"],
  "toolsUsed": ["search_cars"]
}
```

### VIN API
```
POST /api/v1/vin/decode
Body: { "vin": "WBAPH5C55BA123456" }

POST /api/v1/vin/check
Body: { "vin": "WBAPH5C55BA123456" }
```

### Other
- `GET /health` — Health check
- `POST /api/v1/admin/auth/login` — Admin login
- `GET /api/v1/admin/analytics` — Stats (JWT required)

## Database

Neon PostgreSQL 16 with pgvector extension.

Key tables:
- `cars_catalog` — Vehicle catalog with embeddings
- `vin_wmi` — WMI codes for VIN decoding
- `synonyms` — Slang mappings (бумер → BMW)
- `prompts` — Hot-reloadable prompts
- `parse_sessions` — Request logging

## Environment Variables

Required:
- `DATABASE_URL` — Neon PostgreSQL connection
- `OPENROUTER_API_KEY` — LLM API (DeepSeek)
- `JWT_SECRET` — Auth token signing

Optional:
- `FNP_MOCK=true` — Mock ФНП для тестов (API только из России)
- `TOOLS_API_URL` — URL удалённого Car Tools API (если задан, tools выполняются через API)

## Car Tools API Integration

Инструменты можно выполнять локально или через удалённый Car Tools API.

**Локально (по умолчанию):**
Tools выполняются напрямую через локальные сервисы (search, VIN, etc.)

**Через Car Tools API:**
Добавь переменную окружения:
```
TOOLS_API_URL=https://car-tools-api-mcp.onrender.com
```

При включении:
1. Все вызовы tools идут через API
2. При ошибке API — автоматический fallback на локальное выполнение
3. Единая точка входа для всех инструментов

**Репозиторий Car Tools API:** https://github.com/LENA-EE/car-tools-api-mcp

## Rules for Claude

- Всегда читай этот файл перед сложными изменениями
- Не меняй без запроса:
  - Миграции и `database/init.sql`
  - Маршруты API и контракты ответа
- При правках:
  - Сначала опиши план
  - Показывай только изменённые файлы
- Если не уверен — спрашивай
