import { useState, useRef, useEffect } from "react";
import { useChat } from "../model/useChat";
import { ChatMessage, CarDetailModal } from "./ChatMessage";

export function Chat() {
  const [input, setInput] = useState("");
  const [selectedCar, setSelectedCar] = useState(null);
  const [chatMode, setChatMode] = useState("chat"); // "parse" | "chat"
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { messages, loading, sendMessage, clearChat } = useChat();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (input.trim() && !loading) {
      sendMessage(input, chatMode);
      setInput("");
    }
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion, chatMode);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <h2 className="chat-title">AI Помощник</h2>
        <button onClick={clearChat} className="chat-clear-btn">
          Очистить чат
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="chat-mode-toggle">
        <button
          className={"chat-mode-btn" + (chatMode === "parse" ? " chat-mode-btn--active" : "")}
          onClick={() => setChatMode("parse")}
        >
          Быстрый поиск
        </button>
        <button
          className={"chat-mode-btn" + (chatMode === "chat" ? " chat-mode-btn--active" : "")}
          onClick={() => setChatMode("chat")}
        >
          AI Консультант
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            message={msg}
            onSuggestionClick={handleSuggestionClick}
            onCarClick={setSelectedCar}
          />
        ))}

        {loading && (
          <div className="chat-bubble-row chat-bubble-row--assistant">
            <div className="chat-bubble chat-bubble--assistant">
              <div className="chat-typing">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="chat-input-bar">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={chatMode === "parse"
            ? "BMW X5 дизель до 3 млн, кроссовер автомат..."
            : "Опиши какую машину ищешь или введи VIN..."
          }
          disabled={loading}
          className="chat-input"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="chat-send-btn"
        >
          {loading ? "..." : "Отправить"}
        </button>
      </form>

      {/* Hint */}
      <div className="chat-hint">
        {chatMode === "parse"
          ? "Быстрый поиск по фильтрам: марка, кузов, двигатель, бюджет, привод, коробка"
          : 'Примеры: "кроссовер до 2 млн" \u2022 "надежная семейная машина" \u2022 "проверь VIN NMTKH4BX90R122774"'
        }
      </div>

      {/* Car detail modal */}
      {selectedCar && (
        <CarDetailModal
          car={selectedCar}
          onClose={() => setSelectedCar(null)}
          onCheckVin={(query) => {
            sendMessage(query, chatMode);
            setSelectedCar(null);
          }}
        />
      )}
    </div>
  );
}
