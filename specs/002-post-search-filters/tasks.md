# Tasks: Фильтры-уточнения (Post-Search Refinement Chips)

**Input**: Design documents from `/specs/002-post-search-filters/`
**Prerequisites**: plan.md (required), spec.md (required), research.md

**Organization**: Tasks grouped by user story. No test tasks generated (not requested in spec).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Foundational (Blocking Prerequisite)

**Purpose**: Core filter logic hook — all UI and integration tasks depend on this.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Create useFilterChips hook in frontend/src/features/search/model/useFilterChips.js. Implement: (1) FILTER_GROUPS constant array [{key: 'engine_type', label: 'Двигатель'}, {key: 'transmission', label: 'КПП'}, {key: 'drive_type', label: 'Привод'}, {key: 'body_type', label: 'Кузов'}, {key: 'year', label: 'Год'}], (2) activeFilters state as object {groupKey: [values]} initialized to {}, (3) toggleFilter(groupKey, value) — adds value to group array or removes if present, (4) resetFilters() — sets activeFilters to {}, (5) useMemo filteredCars: AND between groups, OR within group, cars with null/undefined field always pass (FR-011), (6) useMemo chipGroups: for each FILTER_GROUP extract unique non-null values from cars, compute faceted counts (count with all OTHER groups' filters applied but excluding current group per research Decision 4), skip group if <=1 unique value, mark chips with count=0 as disabled, (7) useEffect to reset activeFilters when cars array reference changes (new search). Export: { chipGroups, filteredCars, activeFilters, toggleFilter, resetFilters, hasActiveFilters }

**Checkpoint**: Hook ready. Can be tested in isolation by passing mock cars array.

---

## Phase 2: User Story 1+2 — Фильтрация по одному и нескольким параметрам (Priority: P1) MVP

**Goal**: Пользователь видит чипсы-фильтры, кликает — результаты мгновенно фильтруются. Поддержка одиночных и множественных фильтров (ИЛИ внутри группы, И между группами). Disabled-чипсы с (0) при невозможных комбинациях.

**Independent Test**: Поиск "авто до 3 млн" → чипсы появляются → клик "дизель" → список сужается → клик "АКПП" → только дизельные АКПП → повторный клик "дизель" → фильтр снят.

### Implementation for User Story 1+2

- [x] T002 [P] [US1] Create FilterChips.jsx component in frontend/src/features/search/ui/FilterChips.jsx. Props: { chipGroups, activeFilters, onToggle, onReset, hasActiveFilters }. Render: (1) container div, (2) for each chipGroup — group label in muted text, then row of chip buttons, (3) each chip shows "{value} ({count})", (4) chip states via Tailwind: inactive (bg-slate-700 text-slate-300 hover:bg-slate-600), active (bg-cyan-600 text-white), disabled (bg-slate-800 text-slate-600 cursor-not-allowed opacity-50), (5) onClick calls onToggle(groupKey, value) unless disabled, (6) skip rendering group if chipGroup.values is empty
- [x] T003 [US1] Update CarResults.jsx in frontend/src/features/search/ui/CarResults.jsx. Changes: (1) accept new props: chipGroups, activeFilters, filteredCars, onToggleFilter, onResetFilters, hasActiveFilters, (2) import and render FilterChips component between "Показано X из Y" text and car cards list, (3) render FilterChips only when result.results.length > 1, (4) iterate over filteredCars instead of result.results for CarCard rendering, (5) show "Нет авто по выбранным фильтрам" message when filteredCars.length === 0 and hasActiveFilters is true (FR-010)
- [x] T004 [US1] Wire filter state in frontend/src/pages/SearchPage/index.jsx. Changes: (1) import useFilterChips from features/search, (2) call useFilterChips(result?.results || []), (3) pass chipGroups, activeFilters, filteredCars, toggleFilter, resetFilters, hasActiveFilters to CarResults as props
- [x] T005 [P] [US1] Update exports in frontend/src/features/search/index.js. Add exports for useFilterChips and FilterChips

**Checkpoint**: US1+US2 complete. Search → chips appear → single filter works → multi-filter works → disabled chips visible → empty result message shown. MVP functional.

---

## Phase 3: User Story 3 — Счётчик и сброс фильтров (Priority: P2)

**Goal**: Пользователь видит актуальный счётчик отфильтрованных результатов и может сбросить все фильтры одним действием.

**Independent Test**: Применить 2-3 фильтра → счётчик обновляется (например, "Показано 6 из 15") → нажать "Сбросить фильтры" → все фильтры сняты, показаны все результаты.

### Implementation for User Story 3

- [x] T006 [US3] Update result counter in frontend/src/features/search/ui/CarResults.jsx. Change "Показано {result.results.length} из {result.total}" to show filteredCars.length when filters active: "Показано {filteredCars.length} из {result.results.length} загруженных ({result.total} всего)" when hasActiveFilters, else keep original text "Показано {result.results.length} из {result.total} машин"
- [x] T007 [US3] Add "Сбросить фильтры" button in frontend/src/features/search/ui/FilterChips.jsx. Render button only when hasActiveFilters is true. Styled: text-xs text-slate-400 hover:text-cyan-400 cursor-pointer. Text: "✕ Сбросить фильтры". onClick calls onReset. Position: inline after last chip group or in header row.

**Checkpoint**: US3 complete. Counter updates dynamically. Reset button appears/disappears correctly.

---

## Phase 4: Polish & Edge Cases

**Purpose**: Verification and edge case hardening

- [x] T008 Verify loadMore compatibility in frontend/src/pages/SearchPage/index.jsx. Ensure: (1) useFilterChips receives result.results which grows on loadMore, (2) useMemo in hook recalculates chips and counts from full array, (3) active filters persist through loadMore, (4) new chip values from loaded cars appear in groups. No code change expected — verify by testing "Показать ещё" with active filter.
- [x] T009 Run quickstart.md validation: all 7 test scenarios from specs/002-post-search-filters/quickstart.md — happy path, multi-filter, reset, new search, hidden groups, disabled chips, loadMore with filters

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — can start immediately
- **US1+US2 (Phase 2)**: Depends on T001 (hook). T002 and T005 are parallel (different files). T003 depends on T002. T004 depends on T003.
- **US3 (Phase 3)**: Depends on Phase 2 completion. T006 and T007 are parallel (different files).
- **Polish (Phase 4)**: Depends on all user stories complete.

### User Story Dependencies

- **US1+US2 (P1)**: Can start after Phase 1 — no dependencies on other stories
- **US3 (P2)**: Depends on US1+US2 — adds counter and reset to existing UI

### Within Each User Story

- Hook before component
- Component before integration
- Integration before page wiring

### Parallel Opportunities

**Phase 2 (US1+US2)**: T002 (FilterChips) and T005 (exports) parallel with each other

**Phase 3 (US3)**: T006 (counter) and T007 (reset button) parallel — different files

---

## Parallel Example: User Story 1+2

```bash
# Parallel: Component creation and exports (different files)
Task T002: "Create FilterChips.jsx in frontend/src/features/search/ui/"
Task T005: "Update exports in frontend/src/features/search/index.js"

# Sequential: Integration (data flow dependency)
Task T003: "Update CarResults.jsx to render FilterChips"  # depends on T002
Task T004: "Wire filter state in SearchPage/index.jsx"    # depends on T003
```

---

## Implementation Strategy

### MVP First (User Story 1+2)

1. Complete Phase 1: Foundational (T001)
2. Complete Phase 2: US1+US2 frontend integration (T002-T005)
3. **STOP and VALIDATE**: Search → chips appear → filter works → multi-filter works
4. Deploy/demo if ready — core value delivered

### Incremental Delivery

1. Foundational hook → Test with mock data
2. Add US1+US2 → Filtering works → **Deploy (MVP!)**
3. Add US3 → Counter + reset button → Deploy
4. Polish → Verify all scenarios → Final deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- US1 and US2 merged into one phase — both P1, deeply coupled implementation (same hook, same component)
- US3 is incremental improvement on top of US1+US2
- Backend NOT modified — purely frontend feature
- No new npm dependencies required
- Commit after each phase checkpoint
- Total: 9 tasks across 4 phases
