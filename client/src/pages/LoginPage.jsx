import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Zap, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, Github, Chrome, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import toast from "react-hot-toast";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate   = useNavigate();
  const [params]   = useSearchParams();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAToken,  setTwoFAToken]  = useState("");
  const [pendingData, setPendingData] = useState(null);

  const oauthError = params.get("error");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.requires2FA) {
        setPendingData(data);
        setRequires2FA(true);
      } else {
        toast.success(`Welcome back, ${data.user?.displayName || data.user?.username}!`);
        // Admin users logging in via user portal → redirect to dashboard (they can navigate to /admin)
        navigate("/dashboard");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Check your credentials.";
      setError(msg);
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
      localStorage.setItem("token", data.token);
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.response?.data?.message || "Invalid 2FA code.");
    } finally {
      setLoading(false);
    }
  };

  // Get base URL for OAuth - use empty string to leverage Vite proxy
  const getOAuthUrl = (provider) => {
    // In development, Vite proxies /api to backend, so relative URLs work
    // In production, we need absolute URL
    if (import.meta.env.PROD) {
      const apiUrl = import.meta.env.VITE_API_URL || "";
      return `${apiUrl}/api/auth/${provider}`;
    }
    return `/api/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-surface-0 grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand/20 border border-brand/30 flex items-center justify-center shadow-glow mx-auto mb-4">
            <Zap size={22} className="text-brand-glow" />
          </div>
          <h1 className="font-display font-bold text-2xl text-white">VaultFS</h1>
          <p className="text-gray-500 text-sm mt-1">Secure file management</p>
        </div>

        <div className="card p-6 shadow-2xl">
          {oauthError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-red-900/40 text-accent-red text-sm mb-4 animate-fade-up">
              <AlertCircle size={15} />
              OAuth sign-in failed. Please try again.
            </div>
          )}

          {!requires2FA ? (
            <>
              <h2 className="font-display font-bold text-lg text-white mb-5">Sign in</h2>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-red-900/40 text-accent-red text-sm mb-4 animate-fade-up">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      required
                      autoFocus
                      className="input pl-9"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-gray-400">Password</label>
                    <Link to="/forgot-password" className="text-xs text-brand-glow hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      className="input pl-9 pr-10"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-4" />
                </div>
                <div className="relative flex justify-center text-xs text-gray-600 bg-surface-1 px-2">
                  or continue with
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={getOAuthUrl("google")}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-surface-4 bg-surface-2 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-all"
                >
                  <Chrome size={15} />
                  Google
                </a>
                <a
                  href={getOAuthUrl("github")}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-surface-4 bg-surface-2 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-all"
                >
                  <Github size={15} />
                  GitHub
                </a>
              </div>

              <p className="text-center text-sm text-gray-500 mt-5">
                Don't have an account?{" "}
                <Link to="/register" className="text-brand-glow hover:underline font-medium">
                  Sign up
                </Link>
              </p>

              {/* Admin portal link */}
              <div className="mt-4 pt-4 border-t border-surface-3 text-center">
                <Link
                  to="/admin/login"
                  className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-amber-400 transition-colors"
                >
                  <Shield size={11} />
                  Administrator? Access Admin Portal
                </Link>
              </div>
            </>
          ) : (
            /* ── 2FA Step ── */
            <>
              <h2 className="font-display font-bold text-lg text-white mb-2">Two-Factor Auth</h2>
              <p className="text-sm text-gray-400 mb-5">Enter the 6-digit code from your authenticator app.</p>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-red-900/40 text-accent-red text-sm mb-4">
                  <AlertCircle size={15} />
                  {error}
                </div>
              )}

              <form onSubmit={handle2FA} className="space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoFocus
                  required
                  className="input text-center text-xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                  value={twoFAToken}
                  onChange={(e) => setTwoFAToken(e.target.value.replace(/\D/g, ""))}
                />
                <button type="submit" disabled={loading || twoFAToken.length !== 6} className="btn-primary w-full justify-center py-2.5">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : "Verify"}
                </button>
                <button type="button" onClick={() => setRequires2FA(false)} className="btn-ghost w-full justify-center">
                  Back
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}