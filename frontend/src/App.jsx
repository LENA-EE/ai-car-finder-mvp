// TODO: остальное из architecture.txt
// - История 10 диалогов (localStorage)
// - Tailwind CSS

import { useState, useEffect } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

// Auth helper functions
const getToken = () => localStorage.getItem("token");
const setToken = (token) => localStorage.setItem("token", token);
const removeToken = () => localStorage.removeItem("token");
const getUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};
const setUser = (user) => localStorage.setItem("user", JSON.stringify(user));
const removeUser = () => localStorage.removeItem("user");

// Fetch with auth header
const authFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    removeToken();
    removeUser();
    window.location.reload();
  }
  return res;
};

// Компонент Login
function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.details || "Ошибка авторизации");
        return;
      }

      setToken(data.token);
      setUser(data.user);
      onLogin(data.user);
    } catch (err) {
      setError(`Ошибка соединения: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-form">
      <h2>Вход в админ-панель</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Вход..." : "Войти"}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
    </div>
  );
}

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
      const res = await authFetch(`${API_URL}/api/v1/admin/analytics`);
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
    const interval = setInterval(fetchAnalytics, 5000);
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

// Компонент Catalog Upload - POST /api/v1/admin/catalog/upload
function CatalogUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [catalogSize, setCatalogSize] = useState(0);

  // Fetch current catalog size
  const fetchCatalogSize = async () => {
    try {
      const res = await authFetch(`${API_URL}/api/v1/admin/analytics`);
      const data = await res.json();
      setCatalogSize(data.catalog?.total_records || 0);
    } catch (err) {
      console.error("Error fetching catalog size:", err);
    }
  };

  useEffect(() => {
    fetchCatalogSize();
  }, []);

  const isValidFile = (filename) => {
    const lower = filename.toLowerCase();
    return lower.endsWith('.csv') || lower.endsWith('.xml');
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!isValidFile(selectedFile.name)) {
        setError('Поддерживаются только CSV и XML файлы');
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!isValidFile(droppedFile.name)) {
        setError('Поддерживаются только CSV и XML файлы');
        return;
      }
      setFile(droppedFile);
      setError(null);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/admin/catalog/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.details || data.error || 'Ошибка загрузки');
        return;
      }

      setResult(data);
      setFile(null);
      fetchCatalogSize();
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleClearCatalog = async () => {
    if (!window.confirm('Вы уверены? Все записи каталога будут удалены!')) {
      return;
    }

    try {
      const res = await authFetch(`${API_URL}/api/v1/admin/catalog`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ cleared: true, deleted_count: data.deleted_count });
        fetchCatalogSize();
      } else {
        setError(data.details || 'Ошибка очистки');
      }
    } catch (err) {
      setError(`Ошибка: ${err.message}`);
    }
  };

  return (
    <div className="catalog-upload">
      <div className="catalog-info">
        <span>Текущий размер каталога:</span>
        <span className="catalog-count">{catalogSize.toLocaleString('ru-RU')} записей</span>
      </div>

      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".csv,.xml"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        {file ? (
          <div className="file-info">
            <span className="file-name">{file.name}</span>
            <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        ) : (
          <div className="drop-text">
            <p>Перетащите CSV или XML файл сюда</p>
            <p className="drop-hint">или нажмите для выбора</p>
          </div>
        )}
      </div>

      <div className="upload-actions">
        <button
          className="upload-btn"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? 'Загрузка...' : 'Загрузить каталог'}
        </button>
        <button
          className="clear-btn"
          onClick={handleClearCatalog}
          disabled={uploading || catalogSize === 0}
        >
          Очистить каталог
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {result && !result.cleared && (
        <div className="upload-result">
          <h3>Результат загрузки</h3>
          <div className="result-stats">
            <div className="result-item success">
              <span>Добавлено:</span>
              <span>{result.records_added}</span>
            </div>
            <div className="result-item">
              <span>Марок:</span>
              <span>{result.marks_count}</span>
            </div>
            <div className="result-item">
              <span>Моделей:</span>
              <span>{result.models_count}</span>
            </div>
            <div className="result-item">
              <span>Время:</span>
              <span>{(result.duration_ms / 1000).toFixed(1)}с</span>
            </div>
          </div>

          {result.warnings?.length > 0 && (
            <div className="result-warnings">
              {result.warnings.map((w, i) => (
                <div key={i} className="warning-item">
                  {w.type === 'duplicates' && `Дубликатов пропущено: ${w.count}`}
                </div>
              ))}
            </div>
          )}

          {result.errors?.length > 0 && (
            <div className="result-errors">
              <p>Ошибки ({result.errors.length}):</p>
              {result.errors.slice(0, 5).map((e, i) => (
                <div key={i} className="error-item">
                  Строка {e.row}: {e.error}
                </div>
              ))}
              {result.errors.length > 5 && (
                <div className="error-item">...и ещё {result.errors.length - 5}</div>
              )}
            </div>
          )}
        </div>
      )}

      {result?.cleared && (
        <div className="upload-result">
          <div className="result-item success">
            Каталог очищен. Удалено записей: {result.deleted_count}
          </div>
        </div>
      )}

      <div className="csv-format">
        <h4>Поддерживаемые форматы:</h4>
        <p className="format-label">CSV:</p>
        <code>mark_name,folder_name,body_type,engine_volume,hp,transmission,drive_type,engine_type,year,price</code>
        <p className="format-label">XML (Auto.ru):</p>
        <code>&lt;catalog&gt;&lt;mark name="BMW"&gt;&lt;folder name="X5"&gt;&lt;modification&gt;...&lt;/modification&gt;&lt;/folder&gt;&lt;/mark&gt;&lt;/catalog&gt;</code>
        <p className="format-hint">Обязательное поле: mark_name</p>
      </div>
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
      const res = await authFetch(`${API_URL}/api/v1/admin/prompts`);
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
      const res = await authFetch(`${API_URL}/api/v1/admin/prompts`, {
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

  const handleAddSynonym = async () => {
    if (!newSynonym.key || !newSynonym.value) return;
    setSaving(true);
    try {
      const res = await authFetch(`${API_URL}/api/v1/admin/prompts`, {
        method: "POST",
        body: JSON.stringify({
          synonyms: { [newSynonym.key]: newSynonym.value },
        }),
      });
      if (res.ok) {
        setNewSynonym({ key: "", value: "" });
        fetchConfig();
      }
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
  const [user, setUser] = useState(getUser());

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    removeToken();
    removeUser();
    setUser(null);
    setPage("user");
  };

  // Если админ-страница и нет авторизации - показать логин
  const needsAuth = page === "admin" || page === "prompts" || page === "catalog";
  const isAuthed = !!user;

  return (
    <div className="container">
      <div className="header">
        <h1>AI Car Finder</h1>
        {user && (
          <div className="user-info">
            <span>{user.email}</span>
            <button className="logout-btn" onClick={handleLogout}>
              Выйти
            </button>
          </div>
        )}
      </div>

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
          className={page === "catalog" ? "active" : ""}
          onClick={() => setPage("catalog")}
        >
          Каталог
        </button>
        <button
          className={page === "prompts" ? "active" : ""}
          onClick={() => setPage("prompts")}
        >
          Промпты
        </button>
      </div>

      {page === "user" && <UserSearch />}
      {needsAuth && !isAuthed && <LoginForm onLogin={handleLogin} />}
      {page === "admin" && isAuthed && <AdminDashboard />}
      {page === "catalog" && isAuthed && <CatalogUpload />}
      {page === "prompts" && isAuthed && <PromptEditor />}
    </div>
  );
}

export default App;
