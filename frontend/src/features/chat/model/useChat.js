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

  const sendMessage = useCallback(async (text, mode = "friendly") => {
    if (!text.trim() || loading) return;

    // Add user message
    const userMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const res = await fetch(endpoints.chat, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10), // Last 10 messages for context
          mode, // "quick" or "friendly"
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Ошибка");
      }

      // Add assistant response
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          cars: data.cars,
          vinResult: data.vinResult,
          suggestions: data.suggestions,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Ошибка: ${err.message}`,
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
