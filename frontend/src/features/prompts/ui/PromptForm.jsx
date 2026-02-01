export function PromptForm({ config, onUpdate, onSave, saving, message }) {
  return (
    <>
      <div className="editor-section">
        <label>Системный промпт (v{config?.version})</label>
        <textarea
          value={config?.system_prompt || ""}
          onChange={(e) => onUpdate({ system_prompt: e.target.value })}
          rows={4}
        />
      </div>

      <div className="editor-row">
        <div className="editor-field">
          <label>Temperature</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={config?.temperature || 0.1}
            onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
          />
        </div>
        <div className="editor-field">
          <label>Max Tokens</label>
          <input
            type="number"
            value={config?.max_tokens || 200}
            onChange={(e) => onUpdate({ max_tokens: parseInt(e.target.value) })}
          />
        </div>
      </div>

      <button className="save-btn" onClick={onSave} disabled={saving}>
        {saving ? "Сохранение..." : "Сохранить промпт"}
      </button>

      {message && <div className="message">{message}</div>}
    </>
  );
}
