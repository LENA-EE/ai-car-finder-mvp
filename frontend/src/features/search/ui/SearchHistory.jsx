export function SearchHistory({ history, onSelect, onClear }) {
  if (!history.length) return null;

  return (
    <div className="history-dropdown">
      <div className="history-header">
        <span>История запросов</span>
        <button className="history-clear" onClick={onClear}>
          Очистить
        </button>
      </div>
      <div className="history-list">
        {history.map((item, i) => (
          <div
            key={i}
            className="history-item"
            onClick={() => onSelect(item.query)}
          >
            <span className="history-query">{item.query}</span>
            <span className="history-time">
              {new Date(item.timestamp).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
