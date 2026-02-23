import { useState, useRef, useEffect } from "react";
import { useChat } from "../model/useChat";
import { ChatMessage, CarDetailModal } from "./ChatMessage";

export function Chat() {
  const [input, setInput] = useState("");
  const [selectedCar, setSelectedCar] = useState(null);
  const [chatMode, setChatMode] = useState("friendly"); // "quick" | "friendly"
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
    <div className="flex flex-col h-[calc(100vh-180px)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-200">AI Помощник</h2>
        <button
          onClick={clearChat}
          className="text-slate-400 hover:text-slate-200 text-sm"
        >
          Очистить чат
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-slate-800/50 rounded-xl">
        <span className="text-slate-400 text-sm">Режим:</span>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="chatMode"
            value="quick"
            checked={chatMode === "quick"}
            onChange={(e) => setChatMode(e.target.value)}
            className="w-4 h-4 accent-blue-500"
          />
          <span className={`text-sm ${chatMode === "quick" ? "text-slate-200" : "text-slate-400"}`}>
            Быстрый подбор
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="chatMode"
            value="friendly"
            checked={chatMode === "friendly"}
            onChange={(e) => setChatMode(e.target.value)}
            className="w-4 h-4 accent-blue-500"
          />
          <span className={`text-sm ${chatMode === "friendly" ? "text-slate-200" : "text-slate-400"}`}>
            Живое общение
          </span>
        </label>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-2">
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            message={msg}
            onSuggestionClick={handleSuggestionClick}
            onCarClick={setSelectedCar}
          />
        ))}

        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]" />
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Опиши какую машину ищешь или введи VIN..."
          disabled={loading}
          className="flex-1 p-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-3 bg-blue-500 rounded-xl text-white font-medium hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "..." : "Отправить"}
        </button>
      </form>

      {/* Hint */}
      <div className="mt-2 text-center text-slate-500 text-xs">
        Примеры: "кроссовер до 2 млн" • "надёжная семейная машина" • "проверь VIN WBAPH5C55BA123456"
      </div>

      {/* Car detail modal */}
      {selectedCar && (
        <CarDetailModal
          car={selectedCar}
          onClose={() => setSelectedCar(null)}
          onCheckVin={(query) => {
            sendMessage(query);
            setSelectedCar(null);
          }}
        />
      )}
    </div>
  );
}
