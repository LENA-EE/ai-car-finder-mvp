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

// История запросов в localStorage
const HISTORY_KEY = "search_history";
const MAX_HISTORY = 10;

const getHistory = () => {
  try {
    const history = localStorage.getItem(HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
};

const addToHistory = (query) => {
  const trimmed = query.trim();
  if (!trimmed) return;

  let history = getHistory();
  // Удаляем дубликат если есть
  history = history.filter(h => h.query !== trimmed);
  // Добавляем в начало
  history.unshift({
    query: trimmed,
    timestamp: Date.now()
  });
  // Оставляем только 10 последних
  history = history.slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};

// Компонент User Search
function UserSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [history, setHistory] = useState(getHistory());
  const [showHistory, setShowHistory] = useState(false);
  const [lastQuery, setLastQuery] = useState('');

  // POST /api/v1/parse
  const handleSearch = async (searchQuery = query) => {
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setShowHistory(false);
    setLastQuery(q);

    try {
      const res = await fetch(`${API_URL}/api/v1/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, limit: 10, offset: 0 }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка запроса");
        return;
      }
      setResult(data);
      setQuery(""); // Очищаем инпут после успешного ответа
      // Сохраняем в историю только успешные запросы
      addToHistory(q);
      setHistory(getHistory());
    } catch (err) {
      setError(`Ошибка соединения: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Загрузить ещё результатов
  const handleLoadMore = async () => {
    if (!result || !result.hasMore || !lastQuery) return;

    setLoadingMore(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: lastQuery,
          limit: 10,
          offset: result.offset + result.results.length
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setResult(prev => ({
          ...data,
          results: [...prev.results, ...data.results],
          message: prev.message // Сохраняем оригинальное сообщение
        }));
      }
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleHistoryClick = (historyQuery) => {
    setQuery(historyQuery);
    handleSearch(historyQuery);
  };

  const handleClearHistory = () => {
    clearHistory();
    setHistory([]);
    setShowHistory(false);
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
          onFocus={() => history.length > 0 && setShowHistory(true)}
          placeholder="bmw x5 diesel"
          disabled={loading}
        />
        <button onClick={() => handleSearch()} disabled={loading}>
          {loading ? "Поиск..." : "Найти"}
        </button>
      </div>

      {showHistory && history.length > 0 && (
        <div className="history-dropdown">
          <div className="history-header">
            <span>История запросов</span>
            <button className="history-clear" onClick={handleClearHistory}>
              Очистить
            </button>
          </div>
          <div className="history-list">
            {history.map((item, i) => (
              <div
                key={i}
                className="history-item"
                onClick={() => handleHistoryClick(item.query)}
              >
                <span className="history-query">{item.query}</span>
                <span className="history-time">
                  {new Date(item.timestamp).toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result">
          {result.message && (
            <div className="assistant-message">{result.message}</div>
          )}

          {result.filters && (
            <>
              <p>Фильтры для поиска:</p>
              <pre className="filters">
                {JSON.stringify(result.filters, null, 2)}
              </pre>
            </>
          )}

          {result.results?.length > 0 && (
            <div className="cars">
              <p>Показано {result.results.length} из {result.total} машин:</p>
              {result.results.map((car) => (
                <div
                  key={car.id}
                  className="car-card"
                  onClick={() => handleCarClick(car.id)}
                >
                  <div className="car-name">{car.name || "Нет данных"}</div>
                  <div className="car-details">
                    {car.engine || "—"} · {car.year || "—"} ·{" "}
                    {car.price ? car.price.toLocaleString("ru-RU") + " ₽" : "Цена не указана"}
                  </div>
                  <div className="car-hint">Нажмите для подробностей</div>
                </div>
              ))}
              {result.hasMore && (
                <button
                  className="load-more-btn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? 'Загрузка...' : `Показать ещё (${result.total - result.results.length})`}
                </button>
              )}
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
              <span>{selectedCar.body_type || "Нет данных"}</span>
            </div>
            <div className="detail-row">
              <span>Двигатель</span>
              <span>
                {selectedCar.engine_volume || "—"}L {selectedCar.engine_type || "—"}
              </span>
            </div>
            <div className="detail-row">
              <span>Мощность</span>
              <span>{selectedCar.hp ? `${selectedCar.hp} л.с.` : "Нет данных"}</span>
            </div>
            <div className="detail-row">
              <span>КПП</span>
              <span>{selectedCar.transmission || "Нет данных"}</span>
            </div>
            <div className="detail-row">
              <span>Привод</span>
              <span>{selectedCar.drive_type || "Нет данных"}</span>
            </div>
            <div className="detail-row">
              <span>Год</span>
              <span>{selectedCar.year || "Нет данных"}</span>
            </div>
            <div className="detail-row">
              <span>Цена</span>
              <span>{selectedCar.price ? `${selectedCar.price.toLocaleString("ru-RU")} ₽` : "Нет данных"}</span>
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState(''); // 'uploading', 'parsing', 'saving'
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
    setUploadProgress(0);
    setUploadStage('uploading');
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        // Загрузка файла = 0-50%
        const percent = Math.round((e.loaded / e.total) * 50);
        setUploadProgress(percent);
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          setUploadProgress(100);
          setUploadStage('done');
          setResult(data);
          setFile(null);
          fetchCatalogSize();
        } else {
          setError(data.details || data.error || 'Ошибка загрузки');
        }
      } catch (err) {
        setError('Ошибка обработки ответа');
      }
      setUploading(false);
    });

    xhr.addEventListener('error', () => {
      setError('Ошибка соединения');
      setUploading(false);
    });

    // Когда файл загружен, начинается обработка на сервере
    xhr.upload.addEventListener('load', () => {
      setUploadStage('parsing');
      setUploadProgress(50);
      // Симулируем прогресс обработки
      let progress = 50;
      const interval = setInterval(() => {
        progress += 5;
        if (progress >= 95) {
          clearInterval(interval);
          setUploadProgress(95);
          setUploadStage('saving');
        } else {
          setUploadProgress(progress);
        }
      }, 200);
    });

    const token = getToken();
    xhr.open('POST', `${API_URL}/api/v1/admin/catalog/upload`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
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

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <div className="progress-info">
            <span className="progress-stage">
              {uploadStage === 'uploading' && '📤 Загрузка файла...'}
              {uploadStage === 'parsing' && '🔍 Парсинг данных...'}
              {uploadStage === 'saving' && '💾 Сохранение в базу...'}
              {uploadStage === 'done' && '✅ Готово!'}
            </span>
            <span className="progress-percent">{uploadProgress}%</span>
          </div>
        </div>
      )}

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

// Компонент Error Graveyard - "Кладбище ошибок"
function ErrorGraveyard() {
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [resolveNote, setResolveNote] = useState("");
  const [resolvingId, setResolvingId] = useState(null);

  const fetchErrors = async () => {
    try {
      const res = await authFetch(
        `${API_URL}/api/v1/admin/errors?resolved=${showResolved}`
      );
      const data = await res.json();
      setErrors(data.errors || []);
      setStats(data.stats || {});
    } catch (err) {
      console.error("Errors fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrors();
  }, [showResolved]);

  const handleResolve = async (id) => {
    try {
      const res = await authFetch(`${API_URL}/api/v1/admin/errors/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ resolution_note: resolveNote }),
      });
      if (res.ok) {
        setResolvingId(null);
        setResolveNote("");
        fetchErrors();
      }
    } catch (err) {
      console.error("Resolve error:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить эту запись об ошибке?")) return;
    try {
      const res = await authFetch(`${API_URL}/api/v1/admin/errors/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchErrors();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const getErrorTypeLabel = (type) => {
    const labels = {
      parse_failed: "Не распознан",
      no_results: "Нет результатов",
      search_error: "Ошибка поиска",
      unknown_brand: "Неизвестная марка",
      ambiguous_query: "Неоднозначный запрос",
    };
    return labels[type] || type;
  };

  const getErrorTypeColor = (type) => {
    const colors = {
      parse_failed: "#ef4444",
      no_results: "#f59e0b",
      search_error: "#ef4444",
      unknown_brand: "#8b5cf6",
      ambiguous_query: "#3b82f6",
    };
    return colors[type] || "#64748b";
  };

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="error-graveyard">
      <div className="graveyard-stats">
        <div className="stat-item">
          <span className="stat-value error">{stats.unresolved || 0}</span>
          <span className="stat-label">Активных</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.total_occurrences || 0}</span>
          <span className="stat-label">Случаев</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.error_types || 0}</span>
          <span className="stat-label">Типов</span>
        </div>
        <div className="stat-item">
          <span className="stat-value success">{stats.resolved || 0}</span>
          <span className="stat-label">Решено</span>
        </div>
      </div>

      <div className="graveyard-filter">
        <button
          className={!showResolved ? "active" : ""}
          onClick={() => setShowResolved(false)}
        >
          Активные
        </button>
        <button
          className={showResolved ? "active" : ""}
          onClick={() => setShowResolved(true)}
        >
          Решённые
        </button>
        <button className="refresh-btn" onClick={fetchErrors}>
          Обновить
        </button>
      </div>

      {errors.length === 0 ? (
        <div className="no-errors">
          {showResolved
            ? "Нет решённых ошибок"
            : "Отлично! Нет проблемных запросов"}
        </div>
      ) : (
        <div className="errors-list">
          {errors.map((err) => (
            <div key={err.id} className="error-card">
              <div className="error-header">
                <span
                  className="error-type"
                  style={{ backgroundColor: getErrorTypeColor(err.error_type) }}
                >
                  {getErrorTypeLabel(err.error_type)}
                </span>
                <span className="error-frequency">x{err.frequency}</span>
              </div>
              <div className="error-query">{err.query_pattern}</div>
              <div className="error-meta">
                <span>
                  Последний раз:{" "}
                  {new Date(err.last_seen).toLocaleString("ru-RU")}
                </span>
              </div>
              {err.resolved && err.resolution_note && (
                <div className="error-resolution">
                  Решение: {err.resolution_note}
                </div>
              )}
              {!err.resolved && (
                <div className="error-actions">
                  {resolvingId === err.id ? (
                    <div className="resolve-form">
                      <input
                        type="text"
                        placeholder="Комментарий к решению..."
                        value={resolveNote}
                        onChange={(e) => setResolveNote(e.target.value)}
                      />
                      <button onClick={() => handleResolve(err.id)}>
                        Сохранить
                      </button>
                      <button
                        className="cancel"
                        onClick={() => setResolvingId(null)}
                      >
                        Отмена
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        className="resolve-btn"
                        onClick={() => setResolvingId(err.id)}
                      >
                        Решить
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(err.id)}
                      >
                        Удалить
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
  const needsAuth = page === "admin" || page === "prompts" || page === "catalog" || page === "errors";
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
        <button
          className={page === "errors" ? "active" : ""}
          onClick={() => setPage("errors")}
        >
          Ошибки
        </button>
      </div>

      {page === "user" && <UserSearch />}
      {needsAuth && !isAuthed && <LoginForm onLogin={handleLogin} />}
      {page === "admin" && isAuthed && <AdminDashboard />}
      {page === "catalog" && isAuthed && <CatalogUpload />}
      {page === "prompts" && isAuthed && <PromptEditor />}
      {page === "errors" && isAuthed && <ErrorGraveyard />}
    </div>
  );
}

export default App;
