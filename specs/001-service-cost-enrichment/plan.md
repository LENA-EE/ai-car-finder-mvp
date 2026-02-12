# Implementation Plan: Обогащение результатов поиска стоимостью обслуживания

**Branch**: `001-service-cost-enrichment` | **Date**: 2026-02-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-service-cost-enrichment/spec.md`

## Summary

Добавить к результатам поиска автомобилей данные о стоимости обслуживания (годовая стоимость, стоимость на км, источник, признак точности). Данные получаются из внешнего API (auto.dev), кешируются на 24 часа, загружаются асинхронно с прогрессивным отображением на фронтенде. Ключевой принцип: обогащение никогда не ломает основной поиск (graceful degradation).

## Technical Context

**Language/Version**: JavaScript (Node.js 18+), React 18+
**Primary Dependencies**: Express, pg (PostgreSQL client), OpenAI SDK (для OpenRouter)
**Storage**: PostgreSQL 16 — новая таблица для кеша данных обслуживания
**Testing**: smoke-tests.sh, manual curl
**Target Platform**: Linux server (Docker), веб-браузер
**Project Type**: Web application (backend + frontend)
**Performance Goals**: обогащение добавляет не более +2 сек к ответу; таймаут внешнего API — 3 сек
**Constraints**: Graceful degradation обязателен; кеш 24 часа; не менять существующие API контракты
**Scale/Scope**: каталог 50K+ авто, стандартная веб-нагрузка

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Rationale |
|-----------|--------|-----------|
| I. Multi-Agent Pipeline | PASS | Обогащение — отдельный post-processing шаг после DB Search. Не заменяет и не модифицирует существующие агенты. Новый сервис добавляется в pipeline как опциональный этап. |
| II. Graceful Degradation | PASS | Спецификация явно требует fallback на каждом уровне: API недоступен → без обогащения; ошибка для авто → авто без данных; таймаут → прерывание. |
| III. Russian Slang First | PASS | Не затрагивается. Обогащение работает с уже разрешёнными данными (mark_name, folder_name, engine_type). |
| IV. Security by Default | PASS | Валидация ответов внешнего API. Новый endpoint защищён rate limiting. Не требует аутентификации (публичный, как parse). |
| V. Simplicity & YAGNI | PASS | Один сервис, один репозиторий, один endpoint. FSD-структура на фронте. Минимум абстракций. |

**API Contract Note**: Существующий `POST /api/v1/parse` НЕ модифицируется. Обогащение загружается фронтендом через НОВЫЙ endpoint `POST /api/v1/maintenance/batch`. Это сохраняет обратную совместимость и обеспечивает прогрессивную загрузку.

## Project Structure

### Documentation (this feature)

```text
specs/001-service-cost-enrichment/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── maintenance-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── controllers/
│   │   └── maintenance.controller.js    # NEW: batch enrichment handler
│   ├── services/
│   │   └── enrichment/
│   │       └── maintenance.service.js   # NEW: external API + cache logic
│   ├── repositories/
│   │   └── maintenance.repository.js    # NEW: cache table CRUD
│   ├── config/
│   │   └── maintenance.js               # NEW: API URL, timeout, cache TTL
│   └── routes/
│       └── public.routes.js             # MODIFIED: add /maintenance/batch

frontend/
├── src/
│   ├── features/
│   │   └── search/
│   │       ├── model/
│   │       │   └── useSearch.js             # MODIFIED: trigger enrichment after search
│   │       └── ui/
│   │           └── CarResults.jsx           # MODIFIED: pass enrichment data to cards
│   ├── entities/
│   │   └── car/
│   │       └── ui/
│   │           ├── CarCard.jsx              # MODIFIED: show maintenance cost
│   │           ├── CarModal.jsx             # MODIFIED: show maintenance in details
│   │           └── MaintenanceInfo.jsx      # NEW: loading/data/unavailable states
│   └── shared/
│       └── api/
│           └── endpoints.js                 # MODIFIED: add maintenance endpoint
```

**Structure Decision**: Web application (Option 2). Новые файлы следуют существующей архитектуре: backend — controllers/services/repositories, frontend — FSD (features/entities/shared).
