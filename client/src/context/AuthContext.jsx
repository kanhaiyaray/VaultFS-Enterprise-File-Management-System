/**
 * AuthContext.jsx
 * Global authentication state — user, login, logout, refreshUser
 * Used by: ProtectedRoute, Layout, all pages that need user info
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch current user from /api/auth/me ──────────────────────────────────
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { 
      console.log("🔴 No token in localStorage – user is null");
      setUser(null); 
      setLoading(false); 
      return; 
    }
    try {
      const response = await api.get("/api/auth/me");
      console.log("✅ /me response:", response);
      const { data } = response;
      console.log("📦 data object:", data);
      
      if (data && data.user) {
        console.log("👤 User set from /me:", data.user);
        setUser(data.user);
      } else {
        console.warn("⚠️ /me response missing `user` field – keeping existing user (if any)");
        // Do not clear user – maybe the token is still valid but the response is malformed
        // You can fallback to the existing user or keep as is.
      }
    } catch (err) {
      console.error("❌ /me request failed:", err);
      // Only clear token if it's a 401 (unauthorized) – otherwise keep it
      if (err.response && err.response.status === 401) {
        localStorage.removeItem("token");
        setUser(null);
      } else {
        console.warn("⚠️ Non‑401 error – keeping token and user state");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => { 
    refreshUser(); 
  }, [refreshUser]);

  // ── Login ────────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password, fingerprint, deviceInfo) => {
    const response = await api.post("/api/auth/login", { 
      email, 
      password, 
      fingerprint, 
      deviceInfo 
    });
    console.log("🔐 Login response:", response);
    const { data } = response;
    
    if (data.token) {
      localStorage.setItem("token", data.token);
      console.log("💾 Token stored");
    }
    
    if (data.user) {
      setUser(data.user);
      console.log("👤 User set from login:", data.user);
    } else {
      console.warn("⚠️ Login response missing `user` – check backend");
    }
    
    return data;
  }, []);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setUser(null);
    console.log("🚪 Logged out");
  }, []);

  // ── Update user data ──────────────────────────────────────────────────────
  const updateUser = useCallback((updatedUserData) => {
    setUser(prevUser => ({ ...prevUser, ...updatedUserData }));
  }, []);

  // ── Debug: log user changes ────────────────────────────────────────────────
  useEffect(() => {
    console.log("🔄 Auth state updated – user:", user);
  }, [user]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      logout, 
      refreshUser,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}