import { ErrorStats, ErrorList, useErrors } from "@/features/errors";

export function ErrorsPage() {
  const {
    errors,
    stats,
    loading,
    showResolved,
    setShowResolved,
    refresh,
    resolveError,
    deleteError,
  } = useErrors();

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="error-graveyard">
      <ErrorStats stats={stats} />

      <div className="graveyard-filter">
        <button
          className={!showResolved ? "active" : ""}
          onClick={() => setShowResolved(false)}
        >
          Активные
        </button>
        <button
          className={showResolved ? "active" : ""}
          onClick={() => setShowResolved(true)}
        >
          Решённые
        </button>
        <button className="refresh-btn" onClick={refresh}>
          Обновить
        </button>
      </div>

      <ErrorList
        errors={errors}
        showResolved={showResolved}
        onResolve={resolveError}
        onDelete={deleteError}
      />
    </div>
  );
}
