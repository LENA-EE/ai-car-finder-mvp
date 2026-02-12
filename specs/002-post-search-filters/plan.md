# Implementation Plan: Фильтры-уточнения (Post-Search Refinement Chips)

**Branch**: `002-post-search-filters` | **Date**: 2026-02-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-post-search-filters/spec.md`

## Summary

Чисто фронтенд-фича: после поиска авто пользователь видит динамические чипсы-фильтры, сгенерированные из реальных данных результатов. Клик фильтрует на клиенте без обращения к серверу. 5 групп: двигатель, КПП, привод, кузов, год. Логика ИЛИ внутри группы, И между группами. Бекенд не затрагивается.

## Technical Context

**Language/Version**: JavaScript (ES2020+), React 18, Node.js 20
**Primary Dependencies**: React, Vite, Tailwind CSS v4
**Storage**: N/A (клиентская фильтрация in-memory, данные из API response)
**Testing**: Manual smoke tests, curl + browser
**Target Platform**: Web (desktop + mobile browsers)
**Project Type**: Web application (frontend only for this feature)
**Performance Goals**: Мгновенная фильтрация (<16ms per frame), без jank при клике на чипс
**Constraints**: Клиентская память — до 50 результатов одновременно (limit=50 max)
**Scale/Scope**: До 50 карточек авто на клиенте, 5 групп фильтров × ~10 значений

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Multi-Agent Pipeline | N/A | Фронтенд-фича, pipeline не затрагивается |
| II. Graceful Degradation | PASS | Если фильтры нечего показывать (1 unique value) — компонент скрывается. Null-значения не ломают фильтрацию |
| III. Russian Slang First | PASS | Лейблы групп на русском: "Двигатель", "КПП", "Привод", "Кузов", "Год" |
| IV. Security by Default | N/A | Клиентская фильтрация, нет пользовательского ввода в БД |
| V. Simplicity & YAGNI | PASS | Один хук + один компонент. Минимум абстракций. FSD-архитектура соблюдена |
| TC: API контракты | PASS | Бекенд API не меняется. Данные берутся из существующего response |
| TC: FSD-архитектура | PASS | Hook в features/search/model/, UI в features/search/ui/, интеграция в pages/ |

**Gate result**: PASS — нарушений нет.

## Project Structure

### Documentation (this feature)

```text
specs/002-post-search-filters/
├── plan.md              # This file
├── research.md          # Phase 0: исследование подходов
├── data-model.md        # Phase 1: модель данных фильтров
├── quickstart.md        # Phase 1: быстрый старт
└── tasks.md             # Phase 2: задачи (via /speckit.tasks)
```

### Source Code (repository root)

```text
frontend/src/
├── features/search/
│   ├── index.js                    # Barrel exports (MODIFIED: +FilterChips, +useFilterChips)
│   ├── model/
│   │   ├── useSearch.js            # Существующий хук поиска (НЕ ИЗМЕНЁН)
│   │   └── useFilterChips.js       # NEW: Логика фильтрации (115 строк)
│   └── ui/
│       ├── SearchBox.jsx           # НЕ ИЗМЕНЁН
│       ├── SearchHistory.jsx       # НЕ ИЗМЕНЁН
│       ├── CarResults.jsx          # MODIFIED: интеграция FilterChips
│       └── FilterChips.jsx         # NEW: UI компонент чипсов (43 строки)
├── pages/SearchPage/
│   └── index.jsx                   # MODIFIED: подключение useFilterChips
└── entities/car/ui/
    ├── CarCard.jsx                 # НЕ ИЗМЕНЁН
    └── CarModal.jsx                # НЕ ИЗМЕНЁН
```

**Structure Decision**: Frontend-only, FSD-архитектура. Хук (model) отделён от UI. Интеграция через SearchPage, который передаёт состояние в CarResults.

## Complexity Tracking

> Нарушений конституции нет. Таблица пуста.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
