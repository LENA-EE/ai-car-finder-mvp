import { HISTORY_KEY, MAX_HISTORY } from "@/shared/config";

export const getHistory = () => {
  try {
    const history = localStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
};

export const addToHistory = (query) => {
  const trimmed = query.trim();
  if (!trimmed) return;

  let history = getHistory();
  // Remove duplicate if exists
  history = history.filter(h => h.query !== trimmed);
  // Add to beginning
  history.unshift({
    query: trimmed,
    timestamp: Date.now()
  });
  // Keep only last MAX_HISTORY items
  history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};
