# Quickstart: Обогащение результатов поиска стоимостью обслуживания

**Branch**: `001-service-cost-enrichment` | **Date**: 2026-02-08

## Prerequisites

- Node.js 18+
- PostgreSQL 16 (уже настроен через docker-compose)
- Доступ к auto.dev API (ключ в env vars)

## Environment Variables (new)

```env
# Auto.dev API
AUTO_DEV_API_URL=https://auto.dev/api/v1/maintenance
AUTO_DEV_API_KEY=your-api-key-here

# Enrichment config (optional, defaults shown)
MAINTENANCE_CACHE_TTL_HOURS=24
MAINTENANCE_API_TIMEOUT_MS=3000
MAINTENANCE_ANNUAL_MILEAGE_KM=15000
```

## Database Migration

Выполнить SQL для создания таблицы кеша (НЕ в init.sql — отдельная миграция):

```sql
CREATE TABLE IF NOT EXISTS maintenance_cache (
  id SERIAL PRIMARY KEY,
  mark_name VARCHAR(100) NOT NULL,
  folder_name VARCHAR(100) NOT NULL,
  engine_type VARCHAR(30),
  annual_cost_rub INTEGER NOT NULL CHECK (annual_cost_rub > 0),
  cost_per_km_rub DECIMAL(6,2) NOT NULL CHECK (cost_per_km_rub > 0),
  is_approximate BOOLEAN NOT NULL DEFAULT false,
  source VARCHAR(100) NOT NULL,
  fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_maintenance_lookup
  ON maintenance_cache (LOWER(mark_name), LOWER(folder_name), COALESCE(LOWER(engine_type), ''));

CREATE INDEX idx_maintenance_fetched
  ON maintenance_cache (fetched_at);
```

## Quick Test

```bash
# 1. Start services
docker-compose up --build

# 2. Test search (existing)
curl -X POST http://localhost:3002/api/v1/parse \
  -H "Content-Type: application/json" \
  -d '{"query": "бумер x5 дизель до 5 млн"}'

# 3. Test enrichment (new endpoint)
curl -X POST http://localhost:3002/api/v1/maintenance/batch \
  -H "Content-Type: application/json" \
  -d '{
    "cars": [
      {"id": 1, "mark_name": "BMW", "folder_name": "X5", "engine_type": "diesel"},
      {"id": 2, "mark_name": "Toyota", "folder_name": "RAV4", "engine_type": "gasoline"}
    ]
  }'

# Expected: { success: true, data: { "1": {...}, "2": {...} }, metrics: {...} }

# 4. Test graceful degradation (wrong API URL)
# Set AUTO_DEV_API_URL=http://localhost:9999 and repeat step 3
# Expected: { success: true, data: { "1": null, "2": null }, metrics: {...} }
```

## Development Flow

1. **Backend first**: создать service → repository → controller → route
2. **Test backend**: curl к batch endpoint
3. **Frontend**: MaintenanceInfo component → useSearch integration → CarCard/CarModal
4. **Integration test**: полный flow через UI

## Key Files to Modify

| File | Change |
|------|--------|
| `backend/src/services/enrichment/maintenance.service.js` | NEW: API + cache logic |
| `backend/src/repositories/maintenance.repository.js` | NEW: cache CRUD |
| `backend/src/controllers/maintenance.controller.js` | NEW: batch handler |
| `backend/src/config/maintenance.js` | NEW: config |
| `backend/src/routes/public.routes.js` | ADD: /maintenance/batch route |
| `frontend/src/entities/car/ui/MaintenanceInfo.jsx` | NEW: 3-state component |
| `frontend/src/features/search/model/useSearch.js` | ADD: enrichment fetch |
| `frontend/src/entities/car/ui/CarCard.jsx` | ADD: maintenance display |
| `frontend/src/entities/car/ui/CarModal.jsx` | ADD: maintenance in details |
| `frontend/src/shared/api/endpoints.js` | ADD: maintenance endpoint |
