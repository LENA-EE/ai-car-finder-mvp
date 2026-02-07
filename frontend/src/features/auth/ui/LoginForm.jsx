import { useState } from "react";
import { useAuth } from "../model/useAuth";

export function LoginForm({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loading, error } = useAuth(onLogin);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <div className="bg-slate-800 rounded-lg p-8 max-w-[400px] mx-auto mt-10">
      <h2 className="text-center text-slate-200 mb-6 text-xl">Вход в админ-панель</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="p-3 bg-slate-900 border border-slate-700 rounded-md text-slate-200 text-base focus:outline-none focus:border-blue-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Пароль"
          required
          className="p-3 bg-slate-900 border border-slate-700 rounded-md text-slate-200 text-base focus:outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="p-3 bg-blue-500 border-none rounded-md text-white font-bold text-base cursor-pointer transition-colors hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          {loading ? "Вход..." : "Войти"}
        </button>
        {error && (
          <div className="text-red-400 p-3 bg-red-400/10 rounded-lg">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
