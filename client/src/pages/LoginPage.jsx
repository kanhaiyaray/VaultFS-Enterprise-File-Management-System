import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Zap, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, GitBranch, Globe, Shield, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import toast from "react-hot-toast";
import { getDeviceFingerprint, getDeviceInfo } from "../utils/deviceFingerprint";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAToken, setTwoFAToken] = useState("");
  const [pendingData, setPendingData] = useState(null);

  // Suspicious login state
  const [showSuspiciousModal, setShowSuspiciousModal] = useState(false);
  const [suspiciousReasons, setSuspiciousReasons] = useState([]);
  const [suspiciousToken, setSuspiciousToken] = useState("");

  const oauthError = params.get("error");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const fingerprint = await getDeviceFingerprint();
      const deviceInfo = getDeviceInfo();

      const data = await login(email, password, fingerprint, deviceInfo);

      if (data.requires2FA) {
        setPendingData(data);
        setRequires2FA(true);
      } else if (data.requiresVerification) {
        setSuspiciousReasons(data.reasons || ["Suspicious activity detected"]);
        setSuspiciousToken(data.suspiciousToken);
        setShowSuspiciousModal(true);
      } else {
        toast.success(`Welcome back, ${data.user?.displayName || data.user?.username}!`);
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
        token: twoFAToken,
      });
      localStorage.setItem("token", data.token);
      toast.success("2FA verified successfully!");
      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.response?.data?.message || "Invalid 2FA code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySuspicious = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/verify-suspicious", {
        token: suspiciousToken,
        confirm: true
      });

      localStorage.setItem("token", data.token);
      toast.success("Device verified! You can now access your account.");
      window.location.href = "/dashboard";
    } catch (err) {
      toast.error(err.response?.data?.message || "Verification failed. Please try again.");
      setShowSuspiciousModal(false);
    } finally {
      setLoading(false);
    }
  };

  const getOAuthUrl = (provider) => {
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
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Email or Username</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      required
                      autoFocus
                      className="input pl-9"
                      placeholder="you@example.com or username"
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
                  <Globe size={15} />
                  Google
                </a>
                <a
                  href={getOAuthUrl("github")}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-surface-4 bg-surface-2 text-sm text-gray-300 hover:bg-surface-3 hover:text-white transition-all"
                >
                  + <GitBranch size={15} />
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

      {/* Suspicious Login Modal */}
      {showSuspiciousModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-1 border border-amber-900/40 rounded-2xl max-w-md w-full shadow-2xl animate-fade-up">
            <div className="flex items-center gap-3 p-5 border-b border-surface-3">
              <div className="w-10 h-10 rounded-xl bg-amber-900/20 border border-amber-900/30 flex items-center justify-center">
                <AlertTriangle size={20} className="text-accent-amber" />
              </div>
              <div>
                <h3 className="font-display font-bold text-white text-lg">Suspicious Login Detected</h3>
                <p className="text-xs text-gray-500">We noticed unusual activity</p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-300">
                We detected the following security concerns:
              </p>
              <ul className="space-y-2">
                {suspiciousReasons.map((reason, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-amber-400">
                    <Shield size={14} />
                    {reason}
                  </li>
                ))}
              </ul>
              <div className="p-3 bg-amber-900/10 border border-amber-900/20 rounded-lg">
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  For your security, we've blocked this login attempt.
                  If this was you, please verify your identity below.
                  A verification email has been sent to your registered email address.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowSuspiciousModal(false)}
                  className="btn-ghost flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleVerifySuspicious}
                  disabled={loading}
                  className="btn-primary flex-1 justify-center"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}