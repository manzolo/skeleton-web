import { createContext, useContext, useState, type ReactNode } from "react";

interface AuthContextValue {
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));

  function login(t: string) {
    localStorage.setItem("token", t);
    setToken(t);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
  }

  return <AuthContext.Provider value={{ token, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
