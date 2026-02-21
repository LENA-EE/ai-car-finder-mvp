# Implementation Plan: VIN Decoder MVP

**Branch**: `1-vin-decoder` | **Date**: 2026-02-21 | **Spec**: [spec.md](./spec.md)

## Summary

Сервис проверки автомобилей по VIN номеру: расшифровка VIN (марка, модель, год) + проверка по бесплатным API (ГИБДД, ФНП, ФССП). Включает MCP сервер для интеграции с Claude и интеграцию в существующий AI Car Finder.

## Technical Context

**Language/Version**: Node.js 20 (соответствует существующему backend)
**Primary Dependencies**: Express, OpenAI SDK (для MCP), node-fetch
**Storage**: PostgreSQL 16 (кэш проверок), существующая БД
**Testing**: Jest, curl smoke tests
**Target Platform**: Linux server (Render)
**Project Type**: Web application (расширение существующего backend)
**Performance Goals**: Расшифровка <100ms, полная проверка <10s
**Constraints**: Graceful degradation при недоступности внешних API
**Scale/Scope**: Интеграция в существующую систему с 870+ машинами

## Constitution Check

*GATE: Проверка соответствия принципам конституции*

| Принцип | Статус | Комментарий |
|---------|--------|-------------|
| Multi-Agent Pipeline | ✅ | VIN Decoder — новый агент в pipeline |
| Graceful Degradation | ✅ | Fallback при недоступности ГИБДД/ФНП/ФССП |
| Russian Slang First | ✅ | UI на русском, поддержка кириллицы в VIN |
| Security by Default | ✅ | Валидация VIN, rate limiting |
| Simplicity & YAGNI | ✅ | Минимум абстракций, плоская структура |

**Нарушений нет. Готов к Phase 0.**

## Project Structure

### Documentation (this feature)

```text
specs/1-vin-decoder/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # API contracts
│   └── vin-api.yaml     # OpenAPI spec
└── tasks.md             # Phase 2 output
```

### Source Code

```text
backend/
├── src/
│   ├── services/
│   │   └── vin/
│   │       ├── decoder.service.js    # Расшифровка VIN
│   │       ├── gibdd.service.js      # API ГИБДД
│   │       ├── fnp.service.js        # API ФНП (залоги)
│   │       ├── fssp.service.js       # API ФССП
│   │       └── checker.service.js    # Оркестратор проверок
│   ├── repositories/
│   │   └── vin.repository.js         # Кэш проверок
│   ├── controllers/
│   │   └── vin.controller.js         # HTTP endpoints
│   └── routes/
│       └── vin.routes.js             # Route definitions
│
└── mcp-server/                       # MCP сервер (отдельный процесс)
    ├── index.js                      # Entry point
    └── tools/
        ├── decode-vin.js             # Tool: decode_vin
        └── check-vin.js              # Tool: check_vin_history

frontend/
└── src/
    └── features/
        └── vin-checker/              # UI компонент
            ├── VinChecker.jsx
            └── VinResult.jsx
```

**Structure Decision**: Расширение существующего backend с новой папкой `services/vin/`. MCP сервер в отдельной папке для независимого запуска.

## Implementation Phases

### Phase 1: VIN Decoder (P1)
- WMI справочник (производители)
- Валидация VIN (ISO 3779)
- Расшифровка: марка, модель, год

### Phase 2: ГИБДД Integration (P1)
- API клиент гибдд.рф
- Парсинг ответа (ДТП, владельцы, розыск)
- Error handling и retry

### Phase 3: ФНП + ФССП (P2)
- Реестр залогов
- Ограничения ФССП
- Агрегация результатов

### Phase 4: Caching & API (P2)
- PostgreSQL таблица для кэша
- REST endpoints
- Rate limiting

### Phase 5: MCP Server (P3)
- MCP protocol implementation
- Tools: decode_vin, check_vin_history
- Claude Desktop интеграция

### Phase 6: Frontend Integration (P3)
- VIN Checker компонент
- Интеграция в результаты поиска
