/**
 * AdminLoginPage.jsx
 * Separate admin login portal — accessible at /admin/login
 * Distinct branding (amber/shield theme) vs regular user login.
 * After login, validates the user is admin before granting access.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import toast from "react-hot-toast";

export default function AdminLoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // 2FA
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAToken,  setTwoFAToken]  = useState("");
  const [pendingData, setPendingData] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);

      if (data.requires2FA) {
        setPendingData(data);
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      // Role gate: only admin can use this portal
      if (data.user?.role !== "admin") {
        // Kick them out — clear the token that login() just stored
        localStorage.removeItem("token");
        setError("Access denied. This portal is for administrators only. Please use the regular login.");
        setLoading(false);
        return;
      }

      toast.success(`Welcome, Admin ${data.user?.displayName || data.user?.username}!`);
      navigate("/admin");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/2fa/verify-login", {
        userId: pendingData?.userId,
        token:  twoFAToken,
      });
      // After 2FA, check role
      if (data.user?.role !== "admin") {
        setError("Access denied. This portal is for administrators only.");
        setLoading(false);
        return;
      }
      localStorage.setItem("token", data.token);
      toast.success("Admin access granted!");
      window.location.href = "/admin";
    } catch (err) {
      setError(err.response?.data?.message || "Invalid 2FA code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4"
      style={{ backgroundImage: "radial-gradient(ellipse at top, rgba(120,53,15,0.15) 0%, transparent 60%)" }}>

      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(rgba(251,191,36,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="w-full max-w-md relative z-10">

        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-amber-900/30 border border-amber-700/40 flex items-center justify-center shadow-lg mx-auto mb-4"
            style={{ boxShadow: "0 0 30px rgba(251,191,36,0.15)" }}>
            <Shield size={26} className="text-amber-400" />
          </div>
          <h1 className="font-display font-bold text-2xl text-white">Admin Portal</h1>
          <p className="text-gray-500 text-sm mt-1">VaultFS — System Administration</p>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-900/10 border border-amber-900/30 mb-4">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-300/80 leading-relaxed">
            This portal is restricted to system administrators. Unauthorized access attempts are logged.
          </p>
        </div>

        <div className="bg-surface-1 border border-surface-4 rounded-2xl p-6 shadow-2xl">

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-900/20 border border-red-900/40 text-accent-red text-sm mb-4 animate-fade-up">
              <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {!requires2FA ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Admin Email
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="email"
                    autoComplete="username"
                    className="input pl-9 border-amber-900/20 focus:border-amber-700/50"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    className="input pl-9 pr-9 border-amber-900/20 focus:border-amber-700/50"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    onClick={() => setShowPw(!showPw)}
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all
                  bg-amber-600/20 text-amber-300 border border-amber-700/40
                  hover:bg-amber-600/30 hover:border-amber-600/60 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Shield size={15} />}
                {loading ? "Authenticating…" : "Sign In to Admin Portal"}
              </button>
            </form>
          ) : (
            /* 2FA form */
            <form onSubmit={handle2FA} className="space-y-4">
              <div className="text-center py-2">
                <p className="text-sm text-gray-300 font-medium">Two-Factor Authentication</p>
                <p className="text-xs text-gray-500 mt-1">Enter the 6-digit code from your authenticator app.</p>
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="input text-center text-xl tracking-[0.5em] font-mono"
                placeholder="000000"
                value={twoFAToken}
                onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, ""))}
                autoFocus
                required
              />
              <button
                type="submit"
                disabled={loading || twoFAToken.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm transition-all
                  bg-amber-600/20 text-amber-300 border border-amber-700/40
                  hover:bg-amber-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={15} className="animate-spin" /> : "Verify & Access"}
              </button>
            </form>
          )}
        </div>

        {/* Footer links */}
        <div className="text-center mt-5 space-y-2">
          <Link
            to="/login"
            className="text-xs text-gray-600 hover:text-amber-400 transition-colors inline-flex items-center gap-1.5"
          >
            ← Back to User Login
          </Link>
        </div>
      </div>
    </div>
  );
}
