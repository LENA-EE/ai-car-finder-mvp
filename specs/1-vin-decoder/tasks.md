# Tasks: VIN Decoder MVP

**Input**: Design documents from `/specs/1-vin-decoder/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested - test tasks omitted.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US6)
- File paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and database schema

- [ ] T001 Create VIN services directory structure in `backend/src/services/vin/`
- [ ] T002 Create VIN repository file `backend/src/repositories/vin.repository.js`
- [ ] T003 Create VIN controller file `backend/src/controllers/vin.controller.js`
- [ ] T004 Create VIN routes file `backend/src/routes/vin.routes.js`
- [ ] T005 Create database migration `database/migrations/002_add_vin_tables.sql`
- [ ] T006 Run migration to create `vin_checks` and `vin_wmi` tables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core VIN validation and WMI database - required for ALL user stories

**⚠️ CRITICAL**: No user story can begin until this phase is complete

- [ ] T007 [P] Create VIN validator utility in `backend/src/services/vin/validator.js` (ISO 3779 check digit, format validation)
- [ ] T008 [P] Populate WMI reference data in `database/seeds/vin_wmi_data.sql` (100+ manufacturers)
- [ ] T009 Create base VIN service structure in `backend/src/services/vin/index.js` (exports all services)
- [ ] T010 Register VIN routes in `backend/src/index.js` under `/api/v1/vin`
- [ ] T011 Add VIN config to `backend/src/config/index.js` (cache TTL, enabled sources)

**Checkpoint**: Foundation ready - VIN validation works, WMI lookup available

---

## Phase 3: User Story 1 - Расшифровка VIN (Priority: P1) 🎯 MVP

**Goal**: Decode VIN to brand, model, year, country without external APIs

**Independent Test**: `POST /api/v1/vin/decode {"vin": "WBAPH5C55BA123456"}` returns BMW, Germany, 2011

### Implementation for User Story 1

- [ ] T012 [US1] Implement WMI lookup in `backend/src/services/vin/decoder.service.js` (region, country, manufacturer)
- [ ] T013 [US1] Implement year decoder in `backend/src/services/vin/decoder.service.js` (position 10 → year mapping)
- [ ] T014 [US1] Implement full decode logic in `backend/src/services/vin/decoder.service.js` (combine WMI + year + serial)
- [ ] T015 [US1] Add decode endpoint handler in `backend/src/controllers/vin.controller.js`
- [ ] T016 [US1] Add POST `/vin/decode` route in `backend/src/routes/vin.routes.js`
- [ ] T017 [US1] Handle edge cases: cyrillic chars, spaces, invalid chars (I, O, Q)

**Checkpoint**: VIN decode works independently - можно демо

---

## Phase 4: User Story 2 - Проверка ГИБДД (Priority: P1)

**Goal**: Get accident history, owners, wanted status from ГИБДД

**Independent Test**: `POST /api/v1/vin/check {"vin": "...", "sources": ["gibdd"]}` returns ГИБДД data

### Implementation for User Story 2

- [ ] T018 [US2] Create ГИБДД service skeleton in `backend/src/services/vin/gibdd.service.js`
- [ ] T019 [US2] Implement ГИБДД API client with retry logic in `backend/src/services/vin/gibdd.service.js`
- [ ] T020 [US2] Add captcha handling (rucaptcha integration) in `backend/src/services/vin/gibdd.service.js`
- [ ] T021 [US2] Parse ГИБДД response (owners, accidents, wanted, restrictions)
- [ ] T022 [US2] Add GIBDD_ENABLED config flag and RUCAPTCHA_API_KEY to `.env.example`
- [ ] T023 [US2] Implement graceful fallback when ГИБДД unavailable

**Checkpoint**: ГИБДД check works (with captcha solver configured)

---

## Phase 5: User Story 3 - Проверка залогов ФНП (Priority: P2)

**Goal**: Check if car is pledged to a bank via FNP registry

**Independent Test**: `POST /api/v1/vin/check {"vin": "...", "sources": ["fnp"]}` returns pledge data

### Implementation for User Story 3

- [ ] T024 [P] [US3] Create ФНП service in `backend/src/services/vin/fnp.service.js`
- [ ] T025 [US3] Implement ФНП API client (reestr-zalogov.ru) in `backend/src/services/vin/fnp.service.js`
- [ ] T026 [US3] Parse ФНП response (pledgor, date, contract number)
- [ ] T027 [US3] Handle ФНП errors and timeouts gracefully

**Checkpoint**: ФНП pledge check works independently

---

## Phase 6: User Story 4 - Проверка ФССП (Priority: P2)

**Goal**: Check enforcement proceedings from FSSP

**Independent Test**: `POST /api/v1/vin/check {"vin": "...", "sources": ["fssp"]}` returns FSSP data

### Implementation for User Story 4

- [ ] T028 [P] [US4] Create ФССП service in `backend/src/services/vin/fssp.service.js`
- [ ] T029 [US4] Implement ФССП API client (requires registration) in `backend/src/services/vin/fssp.service.js`
- [ ] T030 [US4] Parse ФССП response (enforcement number, date, subject)
- [ ] T031 [US4] Add FSSP_ENABLED and FSSP_API_TOKEN to `.env.example`

**Checkpoint**: FSSP check works independently

---

## Phase 7: User Story 5 - MCP Server (Priority: P3)

**Goal**: Claude can call VIN decoder tools via MCP protocol

**Independent Test**: Claude Desktop can invoke `decode_vin` and `check_vin_history` tools

### Implementation for User Story 5

- [ ] T032 [US5] Create MCP server directory `backend/mcp-server/`
- [ ] T033 [US5] Install MCP SDK dependency `@modelcontextprotocol/sdk`
- [ ] T034 [P] [US5] Create MCP entry point in `backend/mcp-server/index.js`
- [ ] T035 [P] [US5] Implement `decode_vin` tool in `backend/mcp-server/tools/decode-vin.js`
- [ ] T036 [P] [US5] Implement `check_vin_history` tool in `backend/mcp-server/tools/check-vin.js`
- [ ] T037 [US5] Add Claude Desktop config example to `docs/mcp-setup.md`

**Checkpoint**: MCP server works with Claude Desktop

---

## Phase 8: User Story 6 - Интеграция в поиск (Priority: P3)

**Goal**: Users can check VIN from car search results

**Independent Test**: On car card, click "Проверить VIN" → enter VIN → see results

### Implementation for User Story 6

- [ ] T038 [P] [US6] Create VinChecker component in `frontend/src/features/vin-checker/VinChecker.jsx`
- [ ] T039 [P] [US6] Create VinResult component in `frontend/src/features/vin-checker/VinResult.jsx`
- [ ] T040 [US6] Add VIN API client methods to `frontend/src/shared/api/`
- [ ] T041 [US6] Integrate VinChecker into car card in `frontend/src/entities/car/`
- [ ] T042 [US6] Add status indicators (ok/warning/danger) with colors

**Checkpoint**: Full frontend integration works

---

## Phase 9: Core Integration & Caching

**Purpose**: Orchestrator service and caching layer

- [ ] T043 Create checker orchestrator in `backend/src/services/vin/checker.service.js` (combines all sources)
- [ ] T044 Implement caching in `backend/src/repositories/vin.repository.js` (check cache, save results)
- [ ] T045 Add full check endpoint in `backend/src/controllers/vin.controller.js` (`POST /vin/check`)
- [ ] T046 Add cache lookup endpoint in `backend/src/controllers/vin.controller.js` (`GET /vin/check/:vin`)
- [ ] T047 Implement status calculation (ok/warning/danger) based on results
- [ ] T048 Add human-readable summary generation

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements across all stories

- [ ] T049 [P] Add rate limiting to VIN endpoints in `backend/src/routes/vin.routes.js`
- [ ] T050 [P] Update CLAUDE.md with VIN Decoder documentation
- [ ] T051 [P] Update quickstart.md with actual test commands
- [ ] T052 Run smoke tests per quickstart.md
- [ ] T053 Add VIN check to admin analytics (optional)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational - MVP target
- **US2 (Phase 4)**: Depends on Foundational - can parallel with US1
- **US3 (Phase 5)**: Depends on Foundational - can parallel with US1/US2
- **US4 (Phase 6)**: Depends on Foundational - can parallel with others
- **US5 (Phase 7)**: Depends on US1 (needs decoder)
- **US6 (Phase 8)**: Depends on US1 (needs API)
- **Integration (Phase 9)**: Depends on US1-US4 (combines sources)
- **Polish (Phase 10)**: Depends on desired stories complete

### User Story Independence

| Story | Can Start After | Independent? |
|-------|-----------------|--------------|
| US1 - VIN Decode | Phase 2 | ✅ Yes |
| US2 - ГИБДД | Phase 2 | ✅ Yes |
| US3 - ФНП | Phase 2 | ✅ Yes |
| US4 - ФССП | Phase 2 | ✅ Yes |
| US5 - MCP | US1 | ⚠️ Needs decoder |
| US6 - Frontend | US1 | ⚠️ Needs API |

### Parallel Opportunities

```bash
# After Phase 2 (Foundational), these can run in parallel:
- US1: VIN Decoder
- US2: ГИБДД Service
- US3: ФНП Service
- US4: ФССП Service

# Within US5 (MCP), these can run in parallel:
- T035: decode_vin tool
- T036: check_vin_history tool

# Within US6 (Frontend), these can run in parallel:
- T038: VinChecker component
- T039: VinResult component
```

---

## Implementation Strategy

### MVP First (US1 Only) 🎯

1. ✅ Phase 1: Setup (T001-T006)
2. ✅ Phase 2: Foundational (T007-T011)
3. ✅ Phase 3: US1 - VIN Decode (T012-T017)
4. **STOP**: Test decode independently
5. **Deploy**: VIN decode works without external APIs!

### Incremental Delivery

| Increment | Stories | Value |
|-----------|---------|-------|
| MVP | US1 | VIN расшифровка работает |
| +ГИБДД | US1+US2 | Полная проверка ГИБДД |
| +Залоги | US1-US3 | Проверка залогов ФНП |
| +MCP | US1-US5 | Claude интеграция |
| Full | US1-US6 | Frontend интеграция |

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 53 |
| Setup Tasks | 6 |
| Foundational Tasks | 5 |
| US1 Tasks | 6 |
| US2 Tasks | 6 |
| US3 Tasks | 4 |
| US4 Tasks | 4 |
| US5 Tasks | 6 |
| US6 Tasks | 5 |
| Integration Tasks | 6 |
| Polish Tasks | 5 |
| Parallel Opportunities | 15 tasks marked [P] |
| MVP Scope | Phase 1-3 (17 tasks) |
