import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";

export function useErrors() {
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);

  const fetchErrors = useCallback(async () => {
    try {
      const res = await authFetch(endpoints.errors(showResolved));
      const data = await res.json();
      setErrors(data.errors || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error("Errors fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [showResolved]);

  useEffect(() => {
    fetchErrors();
  }, [fetchErrors]);

  const resolveError = async (id, note) => {
    try {
      const res = await authFetch(endpoints.errorResolve(id), {
        method: "POST",
        body: JSON.stringify({ resolution_note: note }),
      });
      if (res.ok) {
        fetchErrors();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Resolve error:", err);
      return false;
    }
  };

  const deleteError = async (id) => {
    if (!window.confirm("Удалить эту запись об ошибке?")) return false;
    try {
      const res = await authFetch(endpoints.errorDelete(id), {
        method: "DELETE",
      });
      if (res.ok) {
        fetchErrors();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Delete error:", err);
      return false;
    }
  };

  return {
    errors,
    stats,
    loading,
    showResolved,
    setShowResolved,
    refresh: fetchErrors,
    resolveError,
    deleteError,
  };
}
