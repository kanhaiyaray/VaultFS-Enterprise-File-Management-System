/**
 * AuthContext.jsx
 * Global authentication state — user, login, logout, refreshUser
 * Used by: ProtectedRoute, Layout, all pages that need user info
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from '../utils/api';      // ✅ named import

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch current user from /api/auth/me ──────────────────────────────────
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data.user);
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  // ── Login: store token then fetch user ────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data;
  }, []);

  // ── Logout: wipe token and user state ────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}