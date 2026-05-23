import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [form,    setForm]    = useState({ username: "", email: "", password: "", confirm: "" });
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    if (form.username.length < 3)          return "Username must be at least 3 characters.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Please enter a valid email.";
    if (form.password.length < 8)          return "Password must be at least 8 characters.";
    if (form.password !== form.confirm)    return "Passwords do not match.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError("");
    setLoading(true);
    try {
      await api.post("/api/auth/register", {
        username: form.username.trim(),
        email:    form.email.trim(),
        password: form.password,
      });
      setSuccess(true);
      toast.success("Account created! Check your email to verify.");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const strength = (() => {
    const pw = form.password;
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8)  s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  })();
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-accent-red", "bg-accent-amber", "bg-brand", "bg-accent-green"][strength];

  if (success) {
    return (
      <div className="min-h-screen bg-surface-0 grid-bg flex items-center justify-center p-4">
        <div className="card p-8 max-w-md w-full text-center shadow-2xl animate-fade-up">
          <div className="w-14 h-14 rounded-full bg-green-900/30 border border-green-900/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-accent-green" />
          </div>
          <h2 className="font-display font-bold text-xl text-white mb-2">Almost there!</h2>
          <p className="text-gray-400 text-sm mb-5">
            A verification link has been sent to <strong className="text-white">{form.email}</strong>.
            Click it to activate your account.
          </p>
          <button onClick={() => navigate("/login")} className="btn-primary justify-center w-full">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand/20 border border-brand/30 flex items-center justify-center shadow-glow mx-auto mb-4">
            <Zap size={22} className="text-brand-glow" />
          </div>
          <h1 className="font-display font-bold text-2xl text-white">VaultFS</h1>
          <p className="text-gray-500 text-sm mt-1">Create your account</p>
        </div>

        <div className="card p-6 shadow-2xl">
          <h2 className="font-display font-bold text-lg text-white mb-5">Sign up</h2>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/20 border border-red-900/40 text-accent-red text-sm mb-4 animate-fade-up">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Username</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  required
                  autoFocus
                  className="input pl-9"
                  placeholder="cooluser123"
                  value={form.username}
                  onChange={set("username")}
                  minLength={3}
                  maxLength={30}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  required
                  className="input pl-9"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set("email")}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  className="input pl-9 pr-10"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set("password")}
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor : "bg-surface-4"}`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500">{strengthLabel} password</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  required
                  className={`input pl-9 ${form.confirm && form.confirm !== form.password ? "border-accent-red/60 focus:border-accent-red/80" : ""}`}
                  placeholder="••••••••"
                  value={form.confirm}
                  onChange={set("confirm")}
                />
              </div>
              {form.confirm && form.confirm !== form.password && (
                <p className="text-[11px] text-accent-red mt-1">Passwords do not match</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Already have an account?{" "}
            <Link to="/login" className="text-brand-glow hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
