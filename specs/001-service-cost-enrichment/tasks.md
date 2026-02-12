# Tasks: Обогащение результатов поиска стоимостью обслуживания

**Input**: Design documents from `/specs/001-service-cost-enrichment/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Organization**: Tasks grouped by user story. No test tasks generated (not requested in spec).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Configuration and database preparation

- [x] T001 Create maintenance config with API URL, timeout (3s), cache TTL (24h), and annual mileage (15000 km) in backend/src/config/maintenance.js. Read env vars: AUTO_DEV_API_URL, AUTO_DEV_API_KEY, MAINTENANCE_CACHE_TTL_HOURS, MAINTENANCE_API_TIMEOUT_MS, MAINTENANCE_ANNUAL_MILEAGE_KM
- [x] T002 [P] Create SQL migration file database/migrations/001-maintenance-cache.sql with maintenance_cache table (id SERIAL PK, mark_name VARCHAR(100) NOT NULL, folder_name VARCHAR(100) NOT NULL, engine_type VARCHAR(30) NULL, annual_cost_rub INTEGER NOT NULL CHECK >0, cost_per_km_rub DECIMAL(6,2) NOT NULL CHECK >0, is_approximate BOOLEAN DEFAULT false, source VARCHAR(100) NOT NULL, fetched_at TIMESTAMP DEFAULT NOW(), created_at TIMESTAMP DEFAULT NOW()), UNIQUE index on (LOWER(mark_name), LOWER(folder_name), COALESCE(LOWER(engine_type), '')), index on fetched_at

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend service layer — cache, external API, batch endpoint. MUST complete before any frontend work.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Create maintenance repository with getCached(mark_name, folder_name, engine_type), upsert(data), and cleanExpired(ttlHours) methods in backend/src/repositories/maintenance.repository.js. Use parameterized queries. Cache lookup: SELECT where fetched_at > NOW() - INTERVAL ttl. UPSERT via ON CONFLICT on unique index.
- [x] T004 Create maintenance service in backend/src/services/enrichment/maintenance.service.js. Implement: (1) fetchFromApi(mark_name, folder_name, engine_type) with AbortController timeout from config (3s default), (2) getMaintenanceForCar(car) — check cache first, on miss call API, upsert result, fallback to mark+model if engine_type has no data (set is_approximate=true), validate cost>0, (3) getMaintenanceBatch(cars) — deduplicate by mark+model+engine key, use Promise.allSettled for parallel processing, map results back to car IDs, return {data, metrics}. Import config from maintenance.js.
- [x] T005 Create batch controller in backend/src/controllers/maintenance.controller.js. Validate request: cars array required, 1-50 items, each must have id + mark_name + folder_name. Call service.getMaintenanceBatch(). Return { success: true, data: {id: MaintenanceData|null}, metrics } per contract. Wrap in try-catch: on any unhandled error return { success: true, data: all-nulls } (never break).
- [x] T006 Register POST /api/v1/maintenance/batch route in backend/src/routes/public.routes.js. Apply existing userLimiter rate limiting middleware (same as parse endpoint).
- [x] T007 [P] Add maintenanceBatch endpoint '/api/v1/maintenance/batch' to frontend/src/shared/api/endpoints.js

**Checkpoint**: Backend ready. Test with curl: `curl -X POST http://localhost:3002/api/v1/maintenance/batch -H "Content-Type: application/json" -d '{"cars":[{"id":1,"mark_name":"BMW","folder_name":"X5","engine_type":"diesel"}]}'`

---

## Phase 3: User Story 1 - Просмотр стоимости обслуживания (Priority: P1) MVP

**Goal**: Пользователь видит стоимость обслуживания для каждого найденного авто: годовая стоимость, стоимость на км, источник данных. Данные загружаются прогрессивно с анимацией.

**Independent Test**: Выполнить поиск "бумер x5 дизель до 5 млн" и убедиться, что карточки появляются сразу, затем подгружаются данные обслуживания с анимацией "Рассчитываем стоимость обслуживания..."

### Implementation for User Story 1

- [x] T008 [P] [US1] Create MaintenanceInfo.jsx component in frontend/src/entities/car/ui/MaintenanceInfo.jsx. Three states via props: (1) loading=true — animated skeleton/pulse with text "Рассчитываем стоимость обслуживания...", (2) data provided — show annual_cost_rub formatted (e.g. "~180 000 р/год"), cost_per_km_rub (e.g. "~12 р/км"), source text, is_approximate badge "приблизительные данные" if true, (3) data=null — show "Данные недоступны" in muted text. Use Tailwind CSS classes. Component accepts props: { data, loading }
- [x] T009 [US1] Add enrichment fetch to useSearch hook in frontend/src/features/search/model/useSearch.js. After successful search (result.results received): (1) set maintenanceLoading=true, (2) POST to maintenanceBatch endpoint with cars array mapped from results (id, mark_name, folder_name, engine_type), (3) on success set maintenanceData state (object keyed by car id), (4) on ANY error silently set maintenanceData={} (graceful degradation), (5) set maintenanceLoading=false. Export maintenanceData and maintenanceLoading from hook.
- [x] T010 [US1] Update CarResults.jsx in frontend/src/features/search/ui/CarResults.jsx. Accept maintenanceData and maintenanceLoading from useSearch hook. Pass to each CarCard: maintenanceData={maintenanceData[car.id]} and maintenanceLoading={maintenanceLoading}
- [x] T011 [P] [US1] Update CarCard.jsx in frontend/src/entities/car/ui/CarCard.jsx. Accept new props: maintenance (object|null) and maintenanceLoading (boolean). Render MaintenanceInfo component below existing car info (price). Import MaintenanceInfo.
- [x] T012 [US1] Update CarModal.jsx in frontend/src/entities/car/ui/CarModal.jsx. Accept maintenance prop. Show maintenance section in modal details: annual cost, cost per km, source, approximate badge. If no data — show "Данные недоступны".
- [x] T013 [US1] Export MaintenanceInfo from frontend/src/entities/car/index.js

**Checkpoint**: US1 complete. Search "бумер x5 дизель" → cards appear → animation → maintenance data loads. MVP functional.

---

## Phase 4: User Story 2 - Graceful degradation (Priority: P1)

**Goal**: При недоступности внешнего API, таймауте или отсутствии данных — основной поиск не ломается. Пользователь всегда видит результаты.

**Independent Test**: Установить AUTO_DEV_API_URL=http://localhost:9999 (несуществующий), выполнить поиск — результаты отображаются без обслуживания, без ошибок.

### Implementation for User Story 2

- [x] T014 [US2] Verify and harden error handling in useSearch.js enrichment fetch in frontend/src/features/search/model/useSearch.js. Ensure: (1) try-catch wraps entire enrichment block, (2) on network error — maintenanceData set to empty object (not undefined), (3) on timeout — same behavior, (4) maintenanceLoading set to false in finally block, (5) no error message shown to user on enrichment failure
- [x] T015 [US2] Add edge case handling in maintenance.service.js in backend/src/services/enrichment/maintenance.service.js. Verify: (1) AbortController abort after timeout, (2) invalid API responses (non-JSON, missing fields) → return null for that car, (3) cost_per_km_rub or annual_cost_rub <= 0 → return null, (4) console.warn on each failed enrichment with car details for ops debugging
- [x] T016 [US2] Verify MaintenanceInfo "unavailable" state renders correctly in frontend/src/entities/car/ui/MaintenanceInfo.jsx. When data=null and loading=false — show "Данные недоступны" in muted gray text without error styling

**Checkpoint**: US2 complete. All degradation scenarios work: API down, slow, per-car errors, invalid data. Search never breaks.

---

## Phase 5: User Story 3 - Прозрачность источника данных (Priority: P2)

**Goal**: Пользователь видит источник данных (auto.dev) и пометку "приблизительные данные" когда сопоставление неточное.

**Independent Test**: Найти авто с данными обслуживания — должен быть указан источник. Для авто без engine_type — пометка "приблизительные данные".

### Implementation for User Story 3

- [x] T017 [US3] Ensure source is displayed in MaintenanceInfo.jsx loaded state in frontend/src/entities/car/ui/MaintenanceInfo.jsx. Show "Источник: {source}" in small muted text below cost info. Already handled if T008 implemented source display; verify and adjust styling if needed.
- [x] T018 [US3] Ensure is_approximate badge is visible and clear in MaintenanceInfo.jsx in frontend/src/entities/car/ui/MaintenanceInfo.jsx. When is_approximate=true — show yellow/amber badge "приблизительные данные" near cost values. Verify badge renders in both CarCard and CarModal contexts.

**Checkpoint**: US3 complete. Source attribution visible. Approximate data clearly marked.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, documentation, cleanup

- [x] T019 Update smoke-tests.sh to include maintenance batch endpoint test: POST /api/v1/maintenance/batch with sample car, verify 200 response with success:true
- [x] T020 [P] Document new env vars (AUTO_DEV_API_URL, AUTO_DEV_API_KEY, MAINTENANCE_*) in relevant config documentation or .env.example
- [x] T021 Run full quickstart.md validation: (1) happy path — search + enrichment, (2) degradation — wrong API URL + search, (3) verify no console errors in browser

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on T001 (config). T007 is parallel (different directory). BLOCKS all user stories.
- **US1 (Phase 3)**: Depends on Phase 2 completion. T008 and T011 are parallel (different files). T009→T010→T012 sequential.
- **US2 (Phase 4)**: Depends on US1 completion (hardens existing code). Tasks mostly sequential (same files).
- **US3 (Phase 5)**: Depends on US1 completion (adds to existing components). T017 and T018 target same file but different sections.
- **Polish (Phase 6)**: Depends on all user stories complete.

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US2 (P1)**: Depends on US1 — hardens existing implementations, verifies edge cases
- **US3 (P2)**: Depends on US1 — extends existing MaintenanceInfo component

### Within Each User Story

- Models/Repositories before Services
- Services before Controllers
- Controllers before Routes
- Backend before Frontend integration
- Components before hook integration

### Parallel Opportunities

**Phase 1**: T001 and T002 can run in parallel (different directories)

**Phase 2**: T007 (frontend endpoint) parallel with T003-T006 (backend chain)

**Phase 3 (US1)**: T008 (MaintenanceInfo) and T011 (CarCard) parallel with each other; T009 (useSearch) must come before T010 (CarResults)

---

## Parallel Example: User Story 1

```bash
# Parallel: Component creation (different files)
Task T008: "Create MaintenanceInfo.jsx in frontend/src/entities/car/ui/"
Task T011: "Update CarCard.jsx in frontend/src/entities/car/ui/"

# Sequential: Hook → Results → Modal (data flow dependency)
Task T009: "Add enrichment fetch to useSearch.js"  # must be first
Task T010: "Update CarResults.jsx to pass data"     # depends on T009
Task T012: "Update CarModal.jsx with maintenance"    # depends on T009
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational backend (T003-T007)
3. Complete Phase 3: US1 frontend integration (T008-T013)
4. **STOP and VALIDATE**: Search → see maintenance costs loading → data appears
5. Deploy/demo if ready — core value delivered

### Incremental Delivery

1. Setup + Foundational → Backend ready, test with curl
2. Add US1 → Maintenance costs visible → **Deploy (MVP!)**
3. Add US2 → Hardened error handling → Deploy
4. Add US3 → Source transparency → Deploy
5. Polish → Smoke tests, documentation → Final deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- US2 is primarily verification/hardening of code built in US1
- Backend service (T004) includes timeout, dedup, fallback by design — US2 verifies edge cases
- MaintenanceInfo (T008) includes all 3 states by design — US2/US3 verify specific state rendering
- Commit after each phase checkpoint
- Total: 21 tasks across 6 phases
