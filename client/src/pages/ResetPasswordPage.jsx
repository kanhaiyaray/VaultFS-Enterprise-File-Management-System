import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, Zap, AlertCircle } from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

function PasswordStrength({ password }) {
  const checks = [
    { label: "8+ characters", pass: password.length >= 8 },
    { label: "Uppercase letter", pass: /[A-Z]/.test(password) },
    { label: "Lowercase letter", pass: /[a-z]/.test(password) },
    { label: "Number or symbol", pass: /[0-9!@#$%^&*]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ["bg-red-500", "bg-accent-red", "bg-accent-amber", "bg-accent-green", "bg-emerald-400"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : "bg-surface-4"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${score < 3 ? "text-gray-500" : "text-accent-green"}`}>
        {labels[score] || ""}
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [params]              = useSearchParams();
  const navigate              = useNavigate();
  const [password, setPass]   = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShow]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone]       = useState(false);

  const token  = params.get("token");
  const userId = params.get("id");

  if (!token || !userId) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle size={40} className="text-accent-red mx-auto" />
          <h2 className="font-display font-bold text-xl text-white">Invalid Link</h2>
          <p className="text-gray-400 text-sm">This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="btn-primary w-full justify-center block">
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords don't match.");

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, userId, password });
      setDone(true);
      toast.success("Password reset!");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      toast.error(err.response?.data?.message || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-0 grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center shadow-glow-sm">
            <Zap size={20} className="text-brand-glow" />
          </div>
          <span className="font-display font-bold text-2xl text-white tracking-tight">VaultFS</span>
        </div>

        <div className="card p-8 animate-fade-up">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-900/20 border border-emerald-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} className="text-emerald-400" />
              </div>
              <h2 className="font-display font-bold text-xl text-white">Password Reset!</h2>
              <p className="text-gray-400 text-sm">Redirecting you to login…</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="font-display font-bold text-xl text-white mb-1">New Password</h2>
                <p className="text-gray-500 text-sm">Choose a strong password for your account.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                    <Lock size={11} /> New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      className="input pr-10"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPass(e.target.value)}
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                    <Lock size={11} /> Confirm Password
                  </label>
                  <input
                    type={showPass ? "text" : "password"}
                    className={`input ${confirm && password !== confirm ? "border-red-500/50" : ""}`}
                    placeholder="Repeat new password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                  />
                  {confirm && password !== confirm && (
                    <p className="text-xs text-accent-red mt-1">Passwords don't match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirm || password !== confirm}
                  className="btn-primary w-full justify-center py-3"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={16} />}
                  {loading ? "Resetting…" : "Reset Password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
