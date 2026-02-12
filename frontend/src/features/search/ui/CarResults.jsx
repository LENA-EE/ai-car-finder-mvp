import { CarCard } from "@/entities/car";
import { FilterChips } from "./FilterChips";

export function CarResults({
  result,
  onCarClick,
  onLoadMore,
  loadingMore,
  chipGroups,
  activeFilters,
  filteredCars,
  onToggleFilter,
  onResetFilters,
  hasActiveFilters,
}) {
  if (!result) return null;

  const carsToShow = filteredCars || result.results || [];

  return (
    <div className="result">
      {result.message && (
        <div className="assistant-message">{result.message}</div>
      )}

      {result.filters && (
        <>
          <p>Фильтры для поиска:</p>
          <pre className="filters">
            {JSON.stringify(result.filters, null, 2)}
          </pre>
        </>
      )}

      {result.results?.length > 0 && (
        <div className="cars">
          <p>
            {hasActiveFilters
              ? `Показано ${carsToShow.length} из ${result.results.length} загруженных (${result.total} всего)`
              : `Показано ${result.results.length} из ${result.total} машин:`}
          </p>

          {result.results.length > 1 && (
            <FilterChips
              chipGroups={chipGroups}
              activeFilters={activeFilters}
              onToggle={onToggleFilter}
              onReset={onResetFilters}
              hasActiveFilters={hasActiveFilters}
            />
          )}

          {carsToShow.length === 0 && hasActiveFilters ? (
            <div className="text-slate-400 text-sm py-4 text-center">
              Нет авто по выбранным фильтрам
            </div>
          ) : (
            carsToShow.map((car) => (
              <CarCard
                key={car.id}
                car={car}
                onClick={onCarClick}
              />
            ))
          )}

          {result.hasMore && (
            <button
              className="load-more-btn"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore
                ? 'Загрузка...'
                : hasActiveFilters
                  ? 'Загрузить ещё'
                  : `Показать ещё (${result.total - result.results.length})`}
            </button>
          )}
        </div>
      )}

      {result.metrics && (
        <div className="metrics">
          Метод: {result.metrics.parsing_method} · Время:{" "}
          {result.metrics.latency_ms}ms · Стоимость: $
          {result.metrics.cost_usd}
        </div>
      )}
    </div>
  );
}
