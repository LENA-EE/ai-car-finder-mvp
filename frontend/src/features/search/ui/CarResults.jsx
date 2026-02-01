import { CarCard } from "@/entities/car";

export function CarResults({ result, onCarClick, onLoadMore, loadingMore }) {
  if (!result) return null;

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
          <p>Показано {result.results.length} из {result.total} машин:</p>
          {result.results.map((car) => (
            <CarCard key={car.id} car={car} onClick={onCarClick} />
          ))}
          {result.hasMore && (
            <button
              className="load-more-btn"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Загрузка...' : `Показать ещё (${result.total - result.results.length})`}
            </button>
          )}
        </div>
      )}

      <div className="metrics">
        Метод: {result.metrics.parsing_method} · Время:{" "}
        {result.metrics.latency_ms}ms · Стоимость: $
        {result.metrics.cost_usd}
      </div>
    </div>
  );
}
