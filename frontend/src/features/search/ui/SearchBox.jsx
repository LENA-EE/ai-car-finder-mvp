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
    <div className="search-box">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyPress={(e) => e.key === "Enter" && handleSearch()}
        onFocus={onFocus}
        placeholder="bmw x5 diesel"
        disabled={loading}
      />
      <button onClick={handleSearch} disabled={loading}>
        {loading ? "Поиск..." : "Найти"}
      </button>
    </div>
  );
}
