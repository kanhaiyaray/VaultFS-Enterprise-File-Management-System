import { useState } from "react";
import { QRCodeSVG } from "qrcode.react"; // install: npm install qrcode.react
import { Loader2, Shield, Smartphone, X } from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

export default function TwoFactorSetup({ onClose, onEnabled }) {
  const [step, setStep] = useState("init"); // init | qr | verify
  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/2fa/setup");
      setSecret(data.secret);
      setQrCode(data.qrCode);
      setStep("qr");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to set up 2FA.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!token || token.length !== 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/auth/2fa/verify", { token });
      toast.success("2FA enabled successfully!");
      onEnabled();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-1 border border-surface-4 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-bold text-white text-lg flex items-center gap-2">
            <Shield size={20} className="text-brand-glow" /> Two-Factor Authentication
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        {step === "init" && (
          <div className="text-center py-4">
            <Smartphone size={48} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-400 mb-4">Enable 2FA to add an extra layer of security.</p>
            <button onClick={handleSetup} disabled={loading} className="btn-primary w-full justify-center">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "Setting up..." : "Set up 2FA"}
            </button>
          </div>
        )}

        {step === "qr" && (
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
            <div className="bg-white p-3 rounded-lg inline-block mx-auto mb-4">
              <QRCodeSVG value={qrCode} size={200} />
            </div>
            <p className="text-xs text-gray-500 break-all mb-2">Secret: <span className="font-mono">{secret}</span></p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit code"
              className="input text-center text-xl tracking-[0.5em] font-mono w-48 mx-auto mb-4"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
            />
            <div className="flex gap-3">
              <button onClick={() => setStep("init")} className="btn-ghost flex-1">Back</button>
              <button onClick={handleVerify} disabled={loading || token.length !== 6} className="btn-primary flex-1 justify-center">
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Verify & Enable"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}