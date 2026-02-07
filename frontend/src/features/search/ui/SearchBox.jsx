import { useState } from "react";

export function SearchBox({ onSearch, loading, onFocus }) {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query);
      setQuery("");
    }
  };

  return (
    <div className="flex gap-2.5 mb-5">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
        onFocus={onFocus}
        placeholder="bmw x5 diesel"
        disabled={loading}
        className="flex-1 p-3 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 text-base focus:outline-none focus:border-blue-500"
      />
      <button
        onClick={handleSearch}
        disabled={loading}
        className="px-6 py-3 bg-blue-500 border-none rounded-lg text-white font-bold cursor-pointer transition-colors hover:bg-blue-600 disabled:bg-slate-600"
      >
        {loading ? "Поиск..." : "Найти"}
      </button>
    </div>
  );
}
