# AI Car Finder Constitution

## Core Principles

### I. Multi-Agent Pipeline

Every пользовательский запрос проходит через цепочку специализированных LLM-агентов: Security Agent (валидация) -> Parser Agent (извлечение фильтров) -> DB Search (поиск). Агенты изолированы, каждый имеет свой промпт и модель. Новые агенты добавляются в pipeline, а не заменяют существующие.

### II. Graceful Degradation

Каждый компонент имеет fallback-цепочку: LLM parser -> keyword parser -> regex. Если LLM недоступен, система продолжает работать. Ни одна внешняя зависимость не должна быть single point of failure.

### III. Russian Slang First

Система спроектирована для понимания русского автомобильного сленга ("бумер", "гелик", "крузак"). Таблица синонимов в БД, few-shot примеры в промптах, поддержка неформальных запросов — всё это first-class concerns, а не afterthoughts.

### IV. Security by Default

Каждый входящий запрос проверяется Security Agent на prompt injection, off-topic и toxic content. Rate limiting на всех endpoint'ах. JWT-аутентификация для админ-панели. Валидация на границах системы (user input, LLM responses).

### V. Simplicity & YAGNI

Минимум абстракций. Плоская структура сервисов. Не добавляем фичи "на будущее". Каждый файл имеет одну ответственность. Frontend следует FSD (Feature-Sliced Design), backend — controllers/services/repositories.

## Technical Constraints

- **Backend**: Node.js + Express. Все SQL-запросы изолированы в repositories.
- **Frontend**: React + Vite + Tailwind CSS. FSD-архитектура (pages/features/entities/shared).
- **Database**: PostgreSQL 16. Миграции и init.sql не меняются без явного запроса.
- **LLM**: OpenRouter API. Модели конфигурируются через env vars, не хардкодятся.
- **API контракты**: Routes и response-формат не меняются без явного согласования.
- **Language**: Код на English, комментарии и UI на Russian.

## Development Workflow

- Перед сложными изменениями — читать CLAUDE.md, architecture.txt и constitution.
- Сначала план изменений, потом код.
- Не менять: init.sql, API контракты, architecture.txt без явного запроса.
- Error Graveyard: неудачные запросы логируются для итеративного улучшения.
- Hot-reload: промпты хранятся в БД, редактируются без перезапуска.

## Governance

Конституция имеет приоритет над любыми другими практиками. Изменения принципов требуют явного обоснования и обновления этого документа. Все PR и ревью должны проверять соответствие принципам.

**Version**: 1.0.0 | **Ratified**: 2026-02-07 | **Last Amended**: 2026-02-07
