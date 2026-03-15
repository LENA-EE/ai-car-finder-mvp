import { useState, useCallback } from "react";
import { endpoints } from "@/shared/api/endpoints";

export function useChat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Привет! Я помогу найти автомобиль. Опиши, что ищешь, или скинь VIN для проверки.",
      suggestions: ["Кроссовер до 2 млн", "Надёжная семейная машина", "BMW X5 дизель"],
    },
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (text, mode = "chat") => {
    if (!text.trim() || loading) return;

    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      if (mode === "parse") {
        // Быстрый поиск — parse pipeline (security -> keyword -> LLM-parser -> SQL)
        const res = await fetch(endpoints.parse, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text, limit: 30 }),
        });

        const data = await res.json();

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message || (data.success ? "Найдено " + data.total + " вариантов" : "Ничего не найдено"),
            cars: data.results || [],
            parseMetrics: data.metrics || null,
          },
        ]);
      } else {
        // AI Консультант — DeepSeek agent с function calling
        const res = await fetch(endpoints.chat, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: messages.slice(-10),
            mode: "friendly",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Ошибка");
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.message,
            cars: data.cars,
            vinResult: data.vinResult,
            suggestions: data.suggestions,
            toolsUsed: data.toolsUsed,
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Ошибка: " + err.message,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        role: "assistant",
        content: "Привет! Я помогу найти автомобиль. Опиши, что ищешь, или скинь VIN для проверки.",
        suggestions: ["Кроссовер до 2 млн", "Надёжная семейная машина", "BMW X5 дизель"],
      },
    ]);
  }, []);

  return {
    messages,
    loading,
    sendMessage,
    clearChat,
  };
}
