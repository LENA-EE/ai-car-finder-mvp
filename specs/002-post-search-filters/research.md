# Research: Фильтры-уточнения (Post-Search Refinement Chips)

**Feature**: 002-post-search-filters | **Date**: 2026-02-08

## Decision 1: Архитектура state management для фильтров

**Decision**: Отдельный хук `useFilterChips(cars)` с `useMemo` для вычислений

**Rationale**: Фильтры — производное состояние от массива результатов. Отдельный хук изолирует логику фильтрации от хука поиска, соблюдая Single Responsibility. `useMemo` пересчитывает чипсы и отфильтрованные результаты только при изменении входных данных или activeFilters.

**Alternatives considered**:
- Встроить логику в `useSearch.js` — загромождает хук поиска, смешивает ответственности
- Внешний state manager (Zustand, Redux) — overkill для локального UI-состояния, нарушает YAGNI
- `useReducer` — усложняет без пользы, `useState` + `useMemo` достаточно

## Decision 2: Структура данных для фильтров

**Decision**: Конфиг групп как массив объектов, active filters как `Map<groupKey, Set<value>>`

**Rationale**:
```javascript
const FILTER_GROUPS = [
  { key: 'engine_type', label: 'Двигатель' },
  { key: 'transmission', label: 'КПП' },
  { key: 'drive_type', label: 'Привод' },
  { key: 'body_type', label: 'Кузов' },
  { key: 'year', label: 'Год' },
];
```
Active filters как `{ engine_type: Set(['diesel']), transmission: Set(['AT']) }` — O(1) lookup при фильтрации, O(1) toggle. Map/Set — нативный JS, без зависимостей. Для React state используем plain objects: `{ engine_type: ['diesel'], transmission: ['AT'] }` (сериализуемость).

**Alternatives considered**:
- Flat array `[{group, value}]` — O(n) lookup при проверке, неудобно для групповой логики ИЛИ
- Nested object `{group: {value: boolean}}` — избыточная вложенность

## Decision 3: Алгоритм фильтрации (ИЛИ внутри, И между)

**Decision**: Двухуровневая фильтрация: для каждого авто проверяем все группы (AND), внутри группы — хотя бы одно совпадение (OR)

**Rationale**:
```
filteredCars = cars.filter(car =>
  activeGroups.every(group =>                    // AND between groups
    !activeFilters[group] ||                     // skip if no filter in group
    car[group] == null ||                        // skip if car has no value (FR-011)
    activeFilters[group].includes(car[group])    // OR within group
  )
)
```
Линейная сложность O(n * g) где n=авто, g=групп (max 5). При n=100 — мгновенно.

**Alternatives considered**:
- Предварительная индексация (Map по значениям) — premature optimization для <100 элементов

## Decision 4: Подсчёт количества на чипсах с учётом кросс-фильтрации

**Decision**: Пересчёт counts с учётом фильтров ДРУГИХ групп, но без учёта текущей группы

**Rationale**: Когда активен фильтр "дизель" в группе двигатель, счётчики в группе КПП должны показывать количество среди дизельных авто. Но счётчики в самой группе двигатель должны показывать количество среди авто, отфильтрованных всеми остальными группами (без учёта двигателя). Это стандартный подход faceted search — позволяет видеть "что будет если переключить фильтр в этой группе".

**Alternatives considered**:
- Counts от полного набора (игнорируя фильтры) — неинформативно, не обновляются
- Counts от текущего отфильтрованного набора — чипсы в той же группе все показывают (0) кроме выбранного

## Decision 5: Расположение компонента FilterChips

**Decision**: Внутри `CarResults.jsx`, между заголовком "Показано X из Y" и списком карточек

**Rationale**: Чипсы контекстуально привязаны к результатам. Рендерятся только когда есть результаты (>1 авто). Заголовок "Показано X из Y" обновляется с учётом фильтрации. Кнопка "Сбросить фильтры" рядом с чипсами.

**Alternatives considered**:
- Над `CarResults` в `SearchPage` — разрыв визуальной связи с результатами
- Sidebar — нет sidebar в текущем дизайне, overkill

## Decision 6: Поведение при "Показать ещё"

**Decision**: При loadMore чипсы пересчитываются из полного массива (old + new). Активные фильтры сохраняются.

**Rationale**: `useFilterChips` принимает `result.results` (растущий массив). При loadMore массив увеличивается → useMemo пересчитывает chips и counts → новые значения могут появиться в чипсах. Фильтрация применяется к полному массиву. Это автоматическое поведение без специального кода.

**Alternatives considered**:
- Сброс фильтров при loadMore — потеря контекста, раздражает пользователя
