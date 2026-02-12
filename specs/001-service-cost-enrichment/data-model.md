# Data Model: Обогащение результатов поиска стоимостью обслуживания

**Branch**: `001-service-cost-enrichment` | **Date**: 2026-02-08

## New Entity: maintenance_cache

Кеш данных обслуживания, полученных из внешнего API. TTL — 24 часа.

### Fields

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| id | SERIAL | PRIMARY KEY | Автоинкремент |
| mark_name | VARCHAR(100) | NOT NULL | Марка (BMW, Toyota) |
| folder_name | VARCHAR(100) | NOT NULL | Модель (X5, RAV4) |
| engine_type | VARCHAR(30) | NULL | Тип двигателя (diesel, gasoline). NULL = данные по марке+модели |
| annual_cost_rub | INTEGER | NOT NULL, > 0 | Средняя годовая стоимость обслуживания в рублях |
| cost_per_km_rub | DECIMAL(6,2) | NOT NULL, > 0 | Стоимость на км пробега в рублях |
| is_approximate | BOOLEAN | NOT NULL, DEFAULT false | true если совпадение только по марке+модели (без engine_type) |
| source | VARCHAR(100) | NOT NULL | Источник данных (например, "auto.dev") |
| fetched_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Время получения данных |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | Время создания записи |

### Indexes

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| idx_maintenance_lookup | (mark_name, folder_name, engine_type) | UNIQUE | Основной поиск + дедупликация |
| idx_maintenance_fetched | (fetched_at) | B-TREE | Очистка устаревших записей |

### Cache Lifecycle

```
1. Запрос обогащения для BMW X5 diesel
2. SELECT FROM maintenance_cache WHERE mark_name='BMW' AND folder_name='X5' AND engine_type='diesel' AND fetched_at > NOW() - INTERVAL '24 hours'
3a. HIT  → Возвращаем из кеша (is_approximate=false)
3b. MISS → Запрос к auto.dev API
4b. INSERT/UPDATE в maintenance_cache (UPSERT по unique index)
5. Если нет данных по engine_type → повторный поиск без engine_type
6. Если найдено по марке+модели → is_approximate=true
7. Если данных нет совсем → не кешируем, возвращаем null
```

## Modified Entity: cars_catalog (read-only)

Существующая таблица НЕ модифицируется. Данные обслуживания присоединяются на уровне сервиса по ключу `(mark_name, folder_name, engine_type)`.

## Enriched Response Model (runtime only, not persisted)

При ответе batch endpoint каждый автомобиль обогащается опциональным объектом:

```
MaintenanceData {
  annual_cost_rub: number       // 180000
  cost_per_km_rub: number       // 12.00
  source: string                // "auto.dev"
  is_approximate: boolean       // false
}
```

Если данные недоступны — поле `maintenance` = `null`.
