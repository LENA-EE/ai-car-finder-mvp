import { useState } from "react";
import { endpoints } from "@/shared/api/endpoints";
import { setToken, setUser } from "@/shared/lib/storage/auth";

export function useAuth(onLogin) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(endpoints.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.details || "Ошибка авторизации");
        return false;
      }

      setToken(data.token);
      setUser(data.user);
      onLogin(data.user);
      return true;
    } catch (err) {
      setError(`Ошибка соединения: ${err.message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
}
