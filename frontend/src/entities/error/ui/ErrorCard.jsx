import { useState } from "react";
import { getErrorTypeLabel, getErrorTypeColor } from "../lib/errorLabels";

export function ErrorCard({ error, onResolve, onDelete }) {
  const [resolveNote, setResolveNote] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = () => {
    onResolve(error.id, resolveNote);
    setIsResolving(false);
    setResolveNote("");
  };

  return (
    <div className="error-card">
      <div className="error-header">
        <span
          className="error-type"
          style={{ backgroundColor: getErrorTypeColor(error.error_type) }}
        >
          {getErrorTypeLabel(error.error_type)}
        </span>
        <span className="error-frequency">x{error.frequency}</span>
      </div>
      <div className="error-query">{error.query_pattern}</div>
      <div className="error-meta">
        <span>
          Последний раз:{" "}
          {new Date(error.last_seen).toLocaleString("ru-RU")}
        </span>
      </div>
      {error.resolved && error.resolution_note && (
        <div className="error-resolution">
          Решение: {error.resolution_note}
        </div>
      )}
      {!error.resolved && (
        <div className="error-actions">
          {isResolving ? (
            <div className="resolve-form">
              <input
                type="text"
                placeholder="Комментарий к решению..."
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
              />
              <button onClick={handleResolve}>
                Сохранить
              </button>
              <button
                className="cancel"
                onClick={() => setIsResolving(false)}
              >
                Отмена
              </button>
            </div>
          ) : (
            <>
              <button
                className="resolve-btn"
                onClick={() => setIsResolving(true)}
              >
                Решить
              </button>
              <button
                className="delete-btn"
                onClick={() => onDelete(error.id)}
              >
                Удалить
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
