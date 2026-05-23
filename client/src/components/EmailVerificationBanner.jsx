/**
 * EmailVerificationBanner
 *
 * Add this near the top of SettingsPage.jsx (or DashboardPage.jsx) to prompt
 * users who haven't verified their email yet.
 *
 * Usage:
 *   import EmailVerificationBanner from "../components/EmailVerificationBanner";
 *   // Inside your page JSX:
 *   <EmailVerificationBanner />
 */
import { useState } from "react";
import { MailCheck, X, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import toast from "react-hot-toast";

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);

  // Only show if email is not verified
  if (!user || user.emailVerified || dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
     await api.post("/api/auth/resend-verification");
      setSent(true);
      toast.success("Verification email sent!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-amber-900/10 border border-amber-900/20 rounded-xl mb-4 animate-fade-up">
      <div className="w-8 h-8 rounded-lg bg-amber-900/20 border border-amber-900/30 flex items-center justify-center flex-shrink-0">
        <MailCheck size={15} className="text-accent-amber" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-amber-200 font-medium">Verify your email address</p>
        <p className="text-xs text-amber-300/60">
          Some features may be restricted until you verify <strong>{user.email}</strong>.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {!sent ? (
          <button
            onClick={handleResend}
            disabled={sending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/20 border border-amber-900/30 text-amber-300 hover:bg-amber-900/40 transition-all text-xs font-medium"
          >
            {sending ? <Loader2 size={11} className="animate-spin" /> : <MailCheck size={11} />}
            {sending ? "Sending…" : "Resend Link"}
          </button>
        ) : (
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <CheckCircle2 size={11} /> Sent!
          </span>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-gray-600 hover:text-gray-400 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
