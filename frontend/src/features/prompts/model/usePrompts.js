import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";

export function usePrompts() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await authFetch(endpoints.prompts);
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error("Prompts error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = (updates) => {
    setConfig({ ...config, ...updates });
  };

  const savePrompt = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch(endpoints.prompts, {
        method: "POST",
        body: JSON.stringify({
          system_prompt: config.system_prompt,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Сохранено! Версия ${data.current_version}`);
        fetchConfig();
      } else {
        setMessage(`Ошибка: ${data.details || data.error}`);
      }
    } catch (err) {
      setMessage(`Ошибка: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const addSynonym = async (key, value) => {
    if (!key || !value) return false;
    setSaving(true);
    try {
      const res = await authFetch(endpoints.prompts, {
        method: "POST",
        body: JSON.stringify({
          synonyms: { [key]: value },
        }),
      });
      if (res.ok) {
        fetchConfig();
        return true;
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    config,
    loading,
    saving,
    message,
    updateConfig,
    savePrompt,
    addSynonym,
  };
}
