import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";

export function useAnalytics(refreshInterval = 5000) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await authFetch(endpoints.analytics);
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchAnalytics, refreshInterval]);

  return { analytics, loading, refresh: fetchAnalytics };
}
