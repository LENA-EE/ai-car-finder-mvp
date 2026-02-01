export const getErrorTypeLabel = (type) => {
  const labels = {
    parse_failed: "Не распознан",
    no_results: "Нет результатов",
    search_error: "Ошибка поиска",
    unknown_brand: "Неизвестная марка",
    ambiguous_query: "Неоднозначный запрос",
  };
  return labels[type] || type;
};

export const getErrorTypeColor = (type) => {
  const colors = {
    parse_failed: "#ef4444",
    no_results: "#f59e0b",
    search_error: "#ef4444",
    unknown_brand: "#8b5cf6",
    ambiguous_query: "#3b82f6",
  };
  return colors[type] || "#64748b";
};
