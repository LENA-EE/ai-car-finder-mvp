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
    <div className="bg-slate-700 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span
          className="text-xs font-bold text-white px-2 py-1 rounded"
          style={{ backgroundColor: getErrorTypeColor(error.error_type) }}
        >
          {getErrorTypeLabel(error.error_type)}
        </span>
        <span className="text-sm font-bold text-yellow-500">x{error.frequency}</span>
      </div>
      <div className="text-base text-slate-200 font-mono px-3 py-2 bg-slate-800 rounded mb-2">
        {error.query_pattern}
      </div>
      <div className="text-xs text-slate-500 mb-2">
        <span>
          Последний раз:{" "}
          {new Date(error.last_seen).toLocaleString("ru-RU")}
        </span>
      </div>
      {error.resolved && error.resolution_note && (
        <div className="text-xs text-green-500 p-2 bg-green-500/10 rounded mb-2">
          Решение: {error.resolution_note}
        </div>
      )}
      {!error.resolved && (
        <div className="flex gap-2">
          {isResolving ? (
            <div className="flex gap-2 flex-1">
              <input
                type="text"
                placeholder="Комментарий к решению..."
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-600 rounded text-slate-200 text-xs"
              />
              <button
                onClick={handleResolve}
                className="px-3 py-1.5 border-none rounded text-xs cursor-pointer bg-green-500 text-white"
              >
                Сохранить
              </button>
              <button
                className="px-3 py-1.5 border-none rounded text-xs cursor-pointer bg-slate-600 text-slate-200"
                onClick={() => setIsResolving(false)}
              >
                Отмена
              </button>
            </div>
          ) : (
            <>
              <button
                className="px-3 py-1.5 border-none rounded text-xs cursor-pointer bg-green-500 text-white hover:bg-green-600 transition-colors"
                onClick={() => setIsResolving(true)}
              >
                Решить
              </button>
              <button
                className="px-3 py-1.5 border-none rounded text-xs cursor-pointer bg-slate-600 text-slate-200 hover:bg-red-500 transition-colors"
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
