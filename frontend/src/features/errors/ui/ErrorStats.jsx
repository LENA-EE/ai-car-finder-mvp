export function ErrorStats({ stats }) {
  return (
    <div className="graveyard-stats">
      <div className="stat-item">
        <span className="stat-value error">{stats.unresolved || 0}</span>
        <span className="stat-label">Активных</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.total_occurrences || 0}</span>
        <span className="stat-label">Случаев</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.error_types || 0}</span>
        <span className="stat-label">Типов</span>
      </div>
      <div className="stat-item">
        <span className="stat-value success">{stats.resolved || 0}</span>
        <span className="stat-label">Решено</span>
      </div>
    </div>
  );
}
