export function AgentsStatus({ agents }) {
  if (!agents) return null;

  const getStatusIcon = (enabled) => enabled ? '✅' : '⚪';
  const getModelName = (model) => {
    if (!model) return '—';
    // Shorten model name for display
    return model.split('/').pop() || model;
  };

  return (
    <div className="agents-status">
      <h3>Мультиагентная система</h3>
      <div className="agents-grid">
        <div className="agent-card">
          <div className="agent-header">
            <span className="agent-icon">🛡️</span>
            <span className="agent-name">Security Agent</span>
            <span className="agent-status">{getStatusIcon(agents.security?.enabled)}</span>
          </div>
          <div className="agent-details">
            <div className="agent-row">
              <span className="label">Модель:</span>
              <span className="value model">{getModelName(agents.security?.model)}</span>
            </div>
            <div className="agent-row">
              <span className="label">Fallback:</span>
              <span className="value fallback">{agents.security?.fallback}</span>
            </div>
          </div>
        </div>

        <div className="agent-card">
          <div className="agent-header">
            <span className="agent-icon">🔍</span>
            <span className="agent-name">Parser Agent</span>
            <span className="agent-status">{getStatusIcon(agents.parser?.enabled)}</span>
          </div>
          <div className="agent-details">
            <div className="agent-row">
              <span className="label">Модель:</span>
              <span className="value model">{getModelName(agents.parser?.model)}</span>
            </div>
            <div className="agent-row">
              <span className="label">Fallback:</span>
              <span className="value fallback">{agents.parser?.fallback}</span>
            </div>
          </div>
        </div>

        <div className="agent-card">
          <div className="agent-header">
            <span className="agent-icon">💬</span>
            <span className="agent-name">Response Agent</span>
            <span className="agent-status">{getStatusIcon(agents.response?.enabled)}</span>
          </div>
          <div className="agent-details">
            <div className="agent-row">
              <span className="label">Модель:</span>
              <span className="value model">{getModelName(agents.response?.model)}</span>
            </div>
            <div className="agent-row">
              <span className="label">Fallback:</span>
              <span className="value fallback">{agents.response?.fallback}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
