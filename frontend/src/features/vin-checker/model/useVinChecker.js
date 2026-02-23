import { useState, useCallback } from "react";
import { endpoints } from "@/shared/api/endpoints";

export function useVinChecker() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const decodeVin = useCallback(async (vin, full = true) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(endpoints.vinDecode, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin, full }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || "Ошибка запроса");
      }

      setResult({ type: "decode", data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkVin = useCallback(async (vin, sources = null, force = true) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body = { vin, force };
      if (sources) {
        body.sources = sources;
      }

      const res = await fetch(endpoints.vinCheck, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.details || data.error || "Ошибка запроса");
      }

      setResult({ type: "check", data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    loading,
    error,
    decodeVin,
    checkVin,
    reset,
  };
}
