import { useState } from "react";
import { useAuth } from "../model/useAuth";

const isLocal = typeof window !== "undefined" && (
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
);

export function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, error } = useAuth(onLogin);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="login-form">
      <h2>Вход в админ-панель</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={isLocal ? "admin@ai-car-finder.app" : "Email"}
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isLocal ? "admin123" : "Пароль"}
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
