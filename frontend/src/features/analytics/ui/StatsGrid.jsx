export function StatsGrid({ analytics }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-value">{analytics?.today?.requests || 0}</div>
        <div className="stat-label">Запросов сегодня</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">
          {((analytics?.today?.parsing_accuracy || 0) * 100).toFixed(1)}%
        </div>
        <div className="stat-label">Точность парсинга</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">
          ${(analytics?.today?.llm_cost_usd || 0).toFixed(4)}
        </div>
        <div className="stat-label">Стоимость LLM</div>
      </div>
      <div className="stat-card">
        <div className="stat-value">
          {analytics?.catalog?.total_records || 0}
        </div>
        <div className="stat-label">Записей в каталоге</div>
      </div>
    </div>
  );
}
