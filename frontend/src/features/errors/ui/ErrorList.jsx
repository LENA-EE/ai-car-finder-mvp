import { ErrorCard } from "@/entities/error";

export function ErrorList({ errors, showResolved, onResolve, onDelete }) {
  if (errors.length === 0) {
    return (
      <div className="no-errors">
        {showResolved
          ? "Нет решённых ошибок"
          : "Отлично! Нет проблемных запросов"}
      </div>
    );
  }

  return (
    <div className="errors-list">
      {errors.map((err) => (
        <ErrorCard
          key={err.id}
          error={err}
          onResolve={onResolve}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
