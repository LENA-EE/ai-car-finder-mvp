// TODO: остальное из architecture.txt
// - История 10 диалогов (localStorage)
// - Tailwind CSS
// - JWT аутентификация

import { useState, useEffect } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";
// Компонент User Search
function UserSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);

  // POST /api/v1/parse
  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка запроса");
        return;
      }
      setResult(data);
    } catch (err) {
      setError(`Ошибка соединения: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // GET /api/v1/cars/:id
  const handleCarClick = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/cars/${id}`);
      const data = await res.json();
      if (res.ok) setSelectedCar(data);
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
    }
  };

  return (
    <>
      <div className="search-box">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          placeholder="bmw x5 diesel"
          disabled={loading}
        />
        <button onClick={handleSearch} disabled={loading}>
          {loading ? "Поиск..." : "Найти"}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result">
          {result.filters ? (
            <>
              <p>Фильтры для поиска:</p>
              <pre className="filters">
                {JSON.stringify(result.filters, null, 2)}
              </pre>
            </>
          ) : (
            <p className="error">Не удалось распознать запрос</p>
          )}

          {result.results?.length > 0 && (
            <div className="cars">
              <p>Найдено {result.results.length} машин:</p>
              {result.results.map((car) => (
                <div
                  key={car.id}
                  className="car-card"
                  onClick={() => handleCarClick(car.id)}
                >
                  <div className="car-name">{car.name}</div>
                  <div className="car-details">
                    {car.engine} · {car.year} ·{" "}
                    {car.price.toLocaleString("ru-RU")} ₽
                  </div>
                  <div className="car-hint">Нажмите для подробностей</div>
                </div>
              ))}
            </div>
          )}

          <div className="metrics">
            Метод: {result.metrics.parsing_method} · Время:{" "}
            {result.metrics.latency_ms}ms · Стоимость: $
            {result.metrics.cost_usd}
          </div>
        </div>
      )}

      {selectedCar && (
        <div className="modal" onClick={() => setSelectedCar(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                {selectedCar.mark_name} {selectedCar.folder_name}
              </span>
              <button
                className="modal-close"
                onClick={() => setSelectedCar(null)}
              >
                ✕
              </button>
            </div>
            <div className="detail-row">
              <span>Кузов</span>
              <span>{selectedCar.body_type}</span>
            </div>
            <div className="detail-row">
              <span>Двигатель</span>
              <span>
                {selectedCar.engine_volume}L {selectedCar.engine_type}
              </span>
            </div>
            <div className="detail-row">
              <span>Мощность</span>
              <span>{selectedCar.hp} л.с.</span>
            </div>
            <div className="detail-row">
              <span>КПП</span>
              <span>{selectedCar.transmission}</span>
            </div>
            <div className="detail-row">
              <span>Привод</span>
              <span>{selectedCar.drive_type}</span>
            </div>
            <div className="detail-row">
              <span>Год</span>
              <span>{selectedCar.year}</span>
            </div>
            <div className="detail-row">
              <span>Цена</span>
              <span>{selectedCar.price.toLocaleString("ru-RU")} ₽</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Компонент Admin Dashboard - GET /api/v1/admin/analytics
function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/analytics`);
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error("Analytics error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000); // Auto-refresh
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{analytics?.today?.requests || 0}</div>
          <div className="stat-label">Запросов сегодня</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {((analytics?.today?.parsing_accuracy || 0) * 100).toFixed(1)}%
          </div>
          <div className="stat-label">Точность парсинга</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            ${(analytics?.today?.llm_cost_usd || 0).toFixed(4)}
          </div>
          <div className="stat-label">Стоимость LLM</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {analytics?.catalog?.total_records || 0}
          </div>
          <div className="stat-label">Записей в каталоге</div>
        </div>
      </div>

      {analytics?.top_brands?.length > 0 && (
        <div className="top-brands">
          <h3>Топ марок</h3>
          {analytics.top_brands.map((brand, i) => (
            <div key={brand.name} className="brand-row">
              <span>
                {i + 1}. {brand.name}
              </span>
              <span>
                {brand.count} ({(brand.share * 100).toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      )}

      <button className="refresh-btn" onClick={fetchAnalytics}>
        Обновить
      </button>
    </div>
  );
}

// Компонент Prompt Editor - POST /api/v1/admin/prompts
function PromptEditor() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [newSynonym, setNewSynonym] = useState({ key: "", value: "" });

  const fetchConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/prompts`);
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error("Prompts error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_prompt: config.system_prompt,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
        }),
      });
      const data = await res.json();
      setMessage(`Сохранено! Версия ${data.current_version}`);
      fetchConfig();
    } catch (err) {
      setMessage(`Ошибка: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSynonym = async () => {
    if (!newSynonym.key || !newSynonym.value) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/api/v1/admin/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          synonyms: { [newSynonym.key]: newSynonym.value },
        }),
      });
      setNewSynonym({ key: "", value: "" });
      fetchConfig();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="prompt-editor">
      <div className="editor-section">
        <label>Системный промпт (v{config?.version})</label>
        <textarea
          value={config?.system_prompt || ""}
          onChange={(e) =>
            setConfig({ ...config, system_prompt: e.target.value })
          }
          rows={4}
        />
      </div>

      <div className="editor-row">
        <div className="editor-field">
          <label>Temperature</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="2"
            value={config?.temperature || 0.1}
            onChange={(e) =>
              setConfig({ ...config, temperature: parseFloat(e.target.value) })
            }
          />
        </div>
        <div className="editor-field">
          <label>Max Tokens</label>
          <input
            type="number"
            value={config?.max_tokens || 200}
            onChange={(e) =>
              setConfig({ ...config, max_tokens: parseInt(e.target.value) })
            }
          />
        </div>
      </div>

      <button className="save-btn" onClick={handleSave} disabled={saving}>
        {saving ? "Сохранение..." : "Сохранить промпт"}
      </button>

      {message && <div className="message">{message}</div>}

      <div className="synonyms-section">
        <h3>Синонимы (сленг → марка)</h3>
        <div className="synonyms-list">
          {config?.synonyms &&
            Object.entries(config.synonyms).map(([key, value]) => (
              <div key={key} className="synonym-row">
                <span>{key}</span>
                <span>→</span>
                <span>{value}</span>
              </div>
            ))}
        </div>
        <div className="add-synonym">
          <input
            placeholder="сленг"
            value={newSynonym.key}
            onChange={(e) =>
              setNewSynonym({ ...newSynonym, key: e.target.value })
            }
          />
          <input
            placeholder="марка"
            value={newSynonym.value}
            onChange={(e) =>
              setNewSynonym({ ...newSynonym, value: e.target.value })
            }
          />
          <button onClick={handleAddSynonym} disabled={saving}>
            +
          </button>
        </div>
      </div>
    </div>
  );
}

// Главный компонент с навигацией
function App() {
  const [page, setPage] = useState("user");

  return (
    <div className="container">
      <h1>AI Car Finder</h1>

      <div className="nav">
        <button
          className={page === "user" ? "active" : ""}
          onClick={() => setPage("user")}
        >
          Поиск
        </button>
        <button
          className={page === "admin" ? "active" : ""}
          onClick={() => setPage("admin")}
        >
          Админ
        </button>
        <button
          className={page === "prompts" ? "active" : ""}
          onClick={() => setPage("prompts")}
        >
          Промпты
        </button>
      </div>

      {page === "user" && <UserSearch />}
      {page === "admin" && <AdminDashboard />}
      {page === "prompts" && <PromptEditor />}
    </div>
  );
}

export default App;
