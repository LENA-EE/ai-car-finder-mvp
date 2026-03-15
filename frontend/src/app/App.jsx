import { useState } from "react";
import { AuthProvider, useAuthContext } from "./providers/AuthProvider";
import { Sidebar } from "@/widgets/Sidebar";
import { ChatPage } from "@/pages/ChatPage";
import { VinPage } from "@/pages/VinPage";
import { AdminPage } from "@/pages/AdminPage";
import { CatalogPage } from "@/pages/CatalogPage";
import { PromptsPage } from "@/pages/PromptsPage";
import { ErrorsPage } from "@/pages/ErrorsPage";
import { KnowledgeBasePage } from "@/pages/KnowledgeBasePage";
import { LoginForm } from "@/features/auth";
import "./styles/index.css";

function AppContent() {
  const [page, setPage] = useState("chat");
  const { user, login, logout } = useAuthContext();

  const needsAuth = page === "admin" || page === "prompts" || page === "catalog" || page === "errors" || page === "kb";
  const isAuthed = !!user;

  const handleLogout = () => {
    logout();
    setPage("chat");
  };

  return (
    <div className="app-layout">
      <Sidebar
        currentPage={page}
        onNavigate={setPage}
        user={user}
        onLogout={handleLogout}
      />
      <main className="app-main">
        <div style={{ display: page === "chat" ? "contents" : "none" }}>
          <ChatPage />
        </div>
        {page === "vin" && <VinPage />}
        {needsAuth && !isAuthed && <LoginForm onLogin={login} />}
        {page === "admin" && isAuthed && <AdminPage />}
        {page === "catalog" && isAuthed && <CatalogPage />}
        {page === "prompts" && isAuthed && <PromptsPage />}
        {page === "errors" && isAuthed && <ErrorsPage />}
        {page === "kb" && isAuthed && <KnowledgeBasePage />}
      </main>
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
