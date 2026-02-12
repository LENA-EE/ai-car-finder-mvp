# API Contract: Maintenance Batch Endpoint

**Branch**: `001-service-cost-enrichment` | **Date**: 2026-02-08

## POST /api/v1/maintenance/batch

Batch-запрос данных обслуживания для списка автомобилей. Публичный endpoint (без JWT). Защищён rate limiter (100 req/min, как parse).

### Request

```json
{
  "cars": [
    {
      "id": 1,
      "mark_name": "BMW",
      "folder_name": "X5",
      "engine_type": "diesel"
    },
    {
      "id": 2,
      "mark_name": "Toyota",
      "folder_name": "RAV4",
      "engine_type": "gasoline"
    },
    {
      "id": 3,
      "mark_name": "Lada",
      "folder_name": "Vesta",
      "engine_type": "gasoline"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| cars | array | yes | Массив автомобилей для обогащения (max 50) |
| cars[].id | number | yes | ID авто (для сопоставления с результатами поиска) |
| cars[].mark_name | string | yes | Марка |
| cars[].folder_name | string | yes | Модель |
| cars[].engine_type | string | no | Тип двигателя. Если не указан — поиск по марке+модели (приблизительные данные) |

### Response (200 OK)

```json
{
  "success": true,
  "data": {
    "1": {
      "annual_cost_rub": 180000,
      "cost_per_km_rub": 12.00,
      "source": "auto.dev",
      "is_approximate": false
    },
    "2": {
      "annual_cost_rub": 95000,
      "cost_per_km_rub": 6.33,
      "source": "auto.dev",
      "is_approximate": false
    },
    "3": null
  },
  "metrics": {
    "total_requested": 3,
    "enriched": 2,
    "cache_hits": 1,
    "api_calls": 1,
    "latency_ms": 450
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| success | boolean | Всегда true (ошибки отдельных авто не ломают batch) |
| data | object | Ключ — car.id, значение — MaintenanceData или null |
| data[id].annual_cost_rub | number | Годовая стоимость обслуживания в рублях |
| data[id].cost_per_km_rub | number | Стоимость на км (при 15 000 км/год) |
| data[id].source | string | Источник данных |
| data[id].is_approximate | boolean | true если данные по марке+модели без engine_type |
| metrics.total_requested | number | Сколько авто запрошено |
| metrics.enriched | number | Сколько авто обогащено |
| metrics.cache_hits | number | Сколько взято из кеша |
| metrics.api_calls | number | Сколько запросов к внешнему API |
| metrics.latency_ms | number | Время обработки batch |

### Response (400 Bad Request)

```json
{
  "success": false,
  "error": "cars array is required and must contain 1-50 items"
}
```

### Response (429 Too Many Requests)

```json
{
  "success": false,
  "error": "Rate limit exceeded"
}
```

### Behavior Notes

- Если внешний API полностью недоступен → все значения в data будут null, success остаётся true
- Если таймаут API (>3 сек) → прерываем запрос, возвращаем то, что успели получить из кеша
- Дедупликация: если в batch 3 BMW X5 diesel → один запрос к API/кешу, результат копируется
- Невалидные данные (cost <= 0) → null для этого авто
- Пустой engine_type → поиск по марке+модели, is_approximate=true
