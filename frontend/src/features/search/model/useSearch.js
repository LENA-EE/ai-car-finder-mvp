import { useState } from "react";
import { endpoints } from "@/shared/api/endpoints";
import { getHistory, addToHistory, clearHistory as clearStorageHistory } from "@/shared/lib/storage/history";

export function useSearch() {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [history, setHistory] = useState(getHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [lastQuery, setLastQuery] = useState('');

  const search = async (query) => {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setShowHistory(false);
    setLastQuery(q);

    try {
      const res = await fetch(endpoints.parse, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 10, offset: 0 }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка запроса");
        return false;
      }
      setResult(data);
      addToHistory(q);
      setHistory(getHistory());
      return true;
    } catch (err) {
      setError(`Ошибка соединения: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!result || !result.hasMore || !lastQuery) return;

    setLoadingMore(true);
    try {
      const res = await fetch(endpoints.parse, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: lastQuery,
          limit: 10,
          offset: result.offset + result.results.length
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(prev => ({
          ...data,
          results: [...prev.results, ...data.results],
          message: prev.message
        }));
      }
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchCarDetails = async (id) => {
    try {
      const res = await fetch(endpoints.car(id));
      const data = await res.json();
      if (res.ok) setSelectedCar(data);
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
    }
  };

  const clearHistory = () => {
    clearStorageHistory();
    setHistory([]);
    setShowHistory(false);
  };

  return {
    loading,
    loadingMore,
    result,
    error,
    selectedCar,
    history,
    showHistory,
    search,
    loadMore,
    fetchCarDetails,
    setSelectedCar,
    setShowHistory,
    clearHistory,
  };
}
