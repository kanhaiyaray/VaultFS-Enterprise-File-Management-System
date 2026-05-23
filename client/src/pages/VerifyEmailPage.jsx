import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Mail, Zap } from "lucide-react";
import api from "../utils/api";

export default function VerifyEmailPage() {
  const [params]          = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [message, setMsg] = useState("");

  useEffect(() => {
    const token = params.get("token");
    const id    = params.get("id");
    if (!token || !id) {
      setStatus("error");
      setMsg("Invalid verification link.");
      return;
    }
    api.get(`/api/auth/verify-email?token=${token}&id=${id}`)
      .then(({ data }) => { setStatus("success"); setMsg(data.message); })
      .catch((err) => {
        setStatus("error");
        setMsg(err.response?.data?.message || "Verification failed. The link may have expired.");
      });
  }, [params]);

  return (
    <div className="min-h-screen bg-surface-0 grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center shadow-glow-sm">
            <Zap size={20} className="text-brand-glow" />
          </div>
          <span className="font-display font-bold text-2xl text-white tracking-tight">VaultFS</span>
        </div>

        <div className="card p-8 text-center animate-fade-up space-y-5">
          {status === "verifying" && (
            <>
              <Loader2 size={40} className="animate-spin text-brand-glow mx-auto" />
              <h2 className="font-display font-bold text-xl text-white">Verifying your email…</h2>
              <p className="text-gray-500 text-sm">Just a moment.</p>
            </>
          )}
          {status === "success" && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-emerald-900/20 border border-emerald-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="font-display font-bold text-xl text-white">Email Verified!</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
              <Link to="/login" className="btn-primary w-full justify-center block">
                Log In Now
              </Link>
            </>
          )}
          {status === "error" && (
            <>
              <div className="w-16 h-16 rounded-2xl bg-red-900/20 border border-red-900/30 flex items-center justify-center mx-auto">
                <XCircle size={32} className="text-accent-red" />
              </div>
              <h2 className="font-display font-bold text-xl text-white">Verification Failed</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{message}</p>
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-600">
                  Log in and request a new verification email from your settings.
                </p>
                <Link to="/login" className="btn-ghost w-full justify-center">
                  <Mail size={14} /> Go to Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
