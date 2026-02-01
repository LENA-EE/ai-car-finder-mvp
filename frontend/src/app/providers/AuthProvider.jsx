import { createContext, useContext, useState } from "react";
import { getUser, removeToken, removeUser } from "@/shared/lib/storage/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getUser());

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    removeToken();
    removeUser();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
}
