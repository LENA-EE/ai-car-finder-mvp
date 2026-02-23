# Car Tools API — План реализации

## Фаза 1: Базовый сервис (День 1)

### 1.1 Инициализация проекта
- [ ] Создать репозиторий на GitHub
- [ ] Инициализировать Node.js проект
- [ ] Настроить структуру папок
- [ ] Добавить зависимости (express, pg, cors)

### 1.2 Database connection
- [ ] Скопировать database.js из ai-car-finder-mvp
- [ ] Подключиться к той же Neon базе
- [ ] Проверить соединение

### 1.3 Tools definitions
- [ ] Создать definitions.js с описаниями всех tools
- [ ] Формат: OpenAI function calling compatible

### 1.4 API Routes
- [ ] GET /health — статус
- [ ] GET /tools — список инструментов
- [ ] POST /tools/execute — выполнение

## Фаза 2: Реализация Tools (День 1-2)

### 2.1 search_cars
- [ ] Перенести логику из ai-car-finder-mvp
- [ ] cars.repository.js → search.tool.js
- [ ] Тесты

### 2.2 VIN tools
- [ ] decode_vin — NHTSA API
- [ ] check_vin — агрегация NHTSA + ФНП
- [ ] Перенести nhtsa.service.js, fnp.service.js

### 2.3 semantic_search
- [ ] Перенести semantic.service.js
- [ ] pgvector запросы

### 2.4 Info tools
- [ ] get_model_info — заглушка для AI
- [ ] compare_models — заглушка для AI

## Фаза 3: Деплой (День 2)

### 3.1 Render setup
- [ ] Создать render.yaml
- [ ] Настроить env variables
- [ ] Деплой

### 3.2 Тестирование
- [ ] Проверить все endpoints
- [ ] Проверить с реальными запросами

## Фаза 4: Интеграция (День 2-3)

### 4.1 ai-car-finder-mvp
- [ ] Обновить agent/executor.js — вызывать API вместо локальных функций
- [ ] Или: оставить локально, использовать API только для внешних клиентов

### 4.2 MCP Adapter
- [ ] Создать mcp/index.js
- [ ] Протестировать с Claude Desktop

## Фаза 5: Документация (День 3)

### 5.1 README для car-tools-api
- [ ] Описание
- [ ] Установка
- [ ] API Reference
- [ ] Примеры интеграции

### 5.2 README для ai-car-finder-mvp
- [ ] Обновить архитектуру
- [ ] Добавить ссылку на car-tools-api

---

## Файлы для создания

```
car-tools-api/
├── src/
│   ├── index.js
│   ├── config/
│   │   └── database.js
│   ├── tools/
│   │   ├── definitions.js
│   │   ├── search.tool.js
│   │   ├── vin.tool.js
│   │   ├── semantic.tool.js
│   │   ├── executor.js
│   │   └── index.js
│   ├── services/
│   │   ├── nhtsa.service.js
│   │   ├── fnp.service.js
│   │   └── wmi.service.js
│   └── routes/
│       └── tools.routes.js
├── mcp/
│   └── index.js
├── package.json
├── render.yaml
├── .env.example
├── .gitignore
└── README.md
```

## Зависимости

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pg": "^8.11.3",
    "dotenv": "^17.2.3"
  },
  "devDependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  }
}
```

## Риски и решения

| Риск | Решение |
|------|---------|
| Две базы данных | Использовать ту же Neon базу |
| Дублирование кода | Перенести, не копировать |
| Латентность API | Кэширование, CDN |
| Безопасность | Rate limiting, опциональный API key |
