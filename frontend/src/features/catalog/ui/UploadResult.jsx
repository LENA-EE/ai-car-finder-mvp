export function UploadResult({ result }) {
  if (!result) return null;

  if (result.cleared) {
    return (
      <div className="upload-result">
        <div className="result-item success">
          Каталог очищен. Удалено записей: {result.deleted_count}
        </div>
      </div>
    );
  }

  return (
    <div className="upload-result">
      <h3>Результат загрузки</h3>
      <div className="result-stats">
        <div className="result-item success">
          <span>Добавлено:</span>
          <span>{result.records_added}</span>
        </div>
        <div className="result-item">
          <span>Марок:</span>
          <span>{result.marks_count}</span>
        </div>
        <div className="result-item">
          <span>Моделей:</span>
          <span>{result.models_count}</span>
        </div>
        <div className="result-item">
          <span>Время:</span>
          <span>{(result.duration_ms / 1000).toFixed(1)}с</span>
        </div>
      </div>

      {result.warnings?.length > 0 && (
        <div className="result-warnings">
          {result.warnings.map((w, i) => (
            <div key={i} className="warning-item">
              {w.type === 'duplicates' && `Дубликатов пропущено: ${w.count}`}
            </div>
          ))}
        </div>
      )}

      {result.errors?.length > 0 && (
        <div className="result-errors">
          <p>Ошибки ({result.errors.length}):</p>
          {result.errors.slice(0, 5).map((e, i) => (
            <div key={i} className="error-item">
              Строка {e.row}: {e.error}
            </div>
          ))}
          {result.errors.length > 5 && (
            <div className="error-item">...и ещё {result.errors.length - 5}</div>
          )}
        </div>
      )}
    </div>
  );
}
