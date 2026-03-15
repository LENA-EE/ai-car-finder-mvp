import { useState, useEffect, useCallback } from "react";
import { authFetch } from "@/shared/api/client";
import { endpoints } from "@/shared/api/endpoints";

export function useKnowledgeBase() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [loadingArticle, setLoadingArticle] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(endpoints.kb);
      const data = await res.json();
      if (res.ok && data.success) {
        setArticles(data.articles || []);
      } else {
        setError(data.details || "Ошибка загрузки");
      }
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const addArticle = async (title, description, content) => {
    setAdding(true);
    setError(null);
    try {
      const res = await authFetch(endpoints.kb, {
        method: "POST",
        body: JSON.stringify({ title, description, content }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchArticles();
        return true;
      } else {
        setError(data.details || "Ошибка добавления");
        return false;
      }
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
      return false;
    } finally {
      setAdding(false);
    }
  };

  const deleteArticle = async (id) => {
    if (!window.confirm("Удалить статью из базы знаний?")) return false;
    setError(null);
    try {
      const res = await authFetch(endpoints.kbDelete(id), { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setArticles((prev) => prev.filter((a) => a.id !== id));
        return true;
      } else {
        setError(data.details || "Ошибка удаления");
        return false;
      }
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
      return false;
    }
  };

  const fetchArticle = async (id) => {
    setLoadingArticle(true);
    setError(null);
    try {
      const res = await authFetch(endpoints.kbArticle(id));
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedArticle(data.article);
      } else {
        setError(data.details || "Ошибка загрузки статьи");
      }
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
    } finally {
      setLoadingArticle(false);
    }
  };

  const updateArticle = async (id, title, description, content) => {
    setUpdating(true);
    setError(null);
    try {
      const res = await authFetch(endpoints.kbArticle(id), {
        method: "PUT",
        body: JSON.stringify({ title, description, content }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchArticles();
        return true;
      } else {
        setError(data.details || "Ошибка обновления");
        return false;
      }
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
      return false;
    } finally {
      setUpdating(false);
    }
  };

  return {
    articles,
    loading,
    error,
    adding,
    addArticle,
    deleteArticle,
    selectedArticle,
    setSelectedArticle,
    loadingArticle,
    fetchArticle,
    updating,
    updateArticle,
    refresh: fetchArticles,
  };
}
