import { useState } from "react";
import { AuthProvider, useAuthContext } from "./providers/AuthProvider";
import { Header } from "@/widgets/Header";
import { Navigation } from "@/widgets/Navigation";
import { SearchPage } from "@/pages/SearchPage";
import { AdminPage } from "@/pages/AdminPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { PromptsPage } from "@/pages/PromptsPage";
import { ErrorsPage } from "@/pages/ErrorsPage";
import { LoginForm } from "@/features/auth";
import "./styles/index.css";

function AppContent() {
  const [page, setPage] = useState("user");
  const { user, login, logout } = useAuthContext();

  const needsAuth = page === "admin" || page === "prompts" || page === "catalog" || page === "errors";
  const isAuthed = !!user;

  const handleLogout = () => {
    logout();
    setPage("user");
  };

  return (
    <div className="container">
      <Header user={user} onLogout={handleLogout} />
      <Navigation currentPage={page} onNavigate={setPage} />

      {page === "user" && <SearchPage />}
      {needsAuth && !isAuthed && <LoginForm onLogin={login} />}
      {page === "admin" && isAuthed && <AdminPage />}
      {page === "catalog" && isAuthed && <CatalogPage />}
      {page === "prompts" && isAuthed && <PromptsPage />}
      {page === "errors" && isAuthed && <ErrorsPage />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
