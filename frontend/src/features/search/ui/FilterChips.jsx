export function FilterChips({ chipGroups, activeFilters, onToggle, onReset, hasActiveFilters }) {
  if (!chipGroups || chipGroups.length === 0) return null;

  return (
    <div className="my-3 space-y-2">
      {hasActiveFilters && (
        <button
          className="text-xs text-slate-400 hover:text-cyan-400 cursor-pointer bg-transparent border-none p-0"
          onClick={onReset}
        >
          ✕ Сбросить фильтры
        </button>
      )}
      {chipGroups.map((group) => (
        <div key={group.key} className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 mr-1">{group.label}:</span>
          {group.values.map((chip) => {
            let className =
              "text-xs px-2 py-0.5 rounded-full border-none cursor-pointer transition-colors";
            if (chip.isActive) {
              className += " bg-cyan-600 text-white";
            } else if (chip.disabled) {
              className += " bg-slate-800 text-slate-600 cursor-not-allowed opacity-50";
            } else {
              className += " bg-slate-700 text-slate-300 hover:bg-slate-600";
            }
            return (
              <button
                key={chip.value}
                className={className}
                onClick={() => !chip.disabled && onToggle(group.key, chip.value)}
                disabled={chip.disabled}
              >
                {chip.value} ({chip.count})
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
