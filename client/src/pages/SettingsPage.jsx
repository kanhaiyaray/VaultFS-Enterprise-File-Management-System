import { useState, useEffect, useRef } from "react";
import {
  Settings, User, Lock, Bell, Webhook, Shield, Monitor, Sun, Moon,
  Loader2, CheckCircle2, Eye, EyeOff, Save, Trash2,
  Mail, Download, Key, Smartphone, LogOut, AlertTriangle,
  X,  // ← add this
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react"; // npm install qrcode.react
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import toast from "react-hot-toast";
import EmailVerificationBanner from "../components/EmailVerificationBanner";
import WebhooksTab from "../components/WebhooksTab";
import DeviceManagement from "../components/DeviceManagement";

// ── Sub-components ────────────────────────────────────────────────────────────
function Section({ title, description, children }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="border-b border-surface-3 pb-3">
        <h3 className="font-display font-semibold text-white text-sm">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function PillToggle({ value, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!value}
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
        value ? "bg-brand" : "bg-surface-4"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
          value ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function Toggle({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-sm text-gray-200 font-medium">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs font-medium transition-colors ${value ? "text-brand-glow" : "text-gray-600"}`}>
          {value ? "On" : "Off"}
        </span>
        <PillToggle value={value} onChange={onChange} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Profile Tab
// ─────────────────────────────────────────────────────────────────────────────
function ProfileTab({ user, refreshUser }) {
  const [form, setForm] = useState({ displayName: user?.displayName || "", bio: user?.bio || "" });
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || user?.avatar || null);
  const fileInputRef = useRef(null);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file."); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = async () => {
        const SIZE = 200;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        const srcSize = Math.min(img.width, img.height);
        const sx = (img.width - srcSize) / 2;
        const sy = (img.height - srcSize) / 2;
        ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, SIZE, SIZE);
        const base64 = canvas.toDataURL("image/jpeg", 0.88);
        setAvatarPreview(base64);
        setAvatarSaving(true);
        try {
          await api.put("/api/users/me", { avatarUrl: base64 });
          await refreshUser();
          toast.success("Profile photo updated!");
        } catch (err) {
          toast.error(err.response?.data?.message || "Failed to upload photo.");
        } finally {
          setAvatarSaving(false);
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/users/me", form);
      await refreshUser();
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed.");
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const response = await api.get("/api/users/me/export", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const disposition = response.headers["content-disposition"] || "";
      const filenameMatch = disposition.match(/filename=([^;]+)/i);
      const filename = filenameMatch?.[1]?.replace(/"/g, "") || `vaultfs-export-${Date.now()}.json`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to export your data.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Profile" description="Your public display information.">
        <div className="flex items-center gap-4 mb-2">
          <div className="relative flex-shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-full overflow-hidden border-2 border-surface-4 hover:border-brand/50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand/40 group"
              title="Click to change photo"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-brand/15 flex items-center justify-center">
                  <span className="text-2xl font-bold text-brand-glow">
                    {(user?.displayName || user?.username)?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {avatarSaving
                  ? <Loader2 size={16} className="text-white animate-spin" />
                  : <span className="text-white text-[10px] font-semibold">Change</span>
                }
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{user?.username}</p>
            <p className="text-xs text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-500 mt-0.5">Click photo to change</p>
            <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1">
              {user?.emailVerified
                ? <><CheckCircle2 size={10} className="text-emerald-400" /> Email verified</>
                : <><AlertTriangle size={10} className="text-accent-amber" /> Email not verified</>
              }
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Display Name</label>
            <input className="input" value={form.displayName} onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))} />
          </div>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary px-5 py-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Profile
        </button>
      </Section>

      <Section title="Data & Privacy" description="Export or delete your account data.">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-200">Export your data</p>
              <p className="text-xs text-gray-500">Download all your files and account info as a ZIP archive.</p>
            </div>
            <button
              onClick={exportData}
              className="btn-ghost text-sm px-4 py-2 flex items-center gap-2"
              disabled={exporting}
            >
              <Download size={13} /> {exporting ? "Exporting..." : "Export"}
            </button>
          </div>
          <div className="border-t border-surface-3 pt-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-accent-red">Delete Account</p>
              <p className="text-xs text-gray-600">Permanently deletes your account and all files. Cannot be undone.</p>
            </div>
            <button
              onClick={() => {
                if (confirm("Are you absolutely sure? This cannot be undone.")) {
                  api.delete("/api/users/me").then(() => { localStorage.clear(); window.location.href = "/login"; });
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-red-900/15 border border-red-900/25 text-accent-red hover:bg-red-900/30 transition-all"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Security Tab (with full 2FA management)
// ─────────────────────────────────────────────────────────────────────────────
function SecurityTab({ user, refreshUser }) {
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  // 2FA states
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableToken, setDisableToken] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);

  const changePassword = async () => {
    if (!pwForm.currentPassword || !pwForm.newPassword) return toast.error("All fields required.");
    if (pwForm.newPassword.length < 8) return toast.error("New password must be at least 8 characters.");
    if (pwForm.newPassword !== pwForm.confirm) return toast.error("Passwords don't match.");

    setSaving(true);
    try {
      await api.put("/api/auth/change-password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success("Password changed.");
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to change password.");
    } finally {
      setSaving(false);
    }
  };

  const handleEnable2FA = () => setShowSetupModal(true);

  const handleDisable2FA = async () => {
    if (!disableToken || disableToken.length !== 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }
    setTwoFALoading(true);
    try {
      await api.post("/api/auth/2fa/disable", { token: disableToken });
      toast.success("2FA disabled.");
      setShowDisableModal(false);
      setDisableToken("");
      refreshUser(); // refresh user data to reflect change
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid code.");
    } finally {
      setTwoFALoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Section title="Change Password" description="Use a strong, unique password.">
        <div className="space-y-3">
          {["currentPassword", "newPassword", "confirm"].map((field) => (
            <div key={field}>
              <label className="block text-xs text-gray-400 mb-1.5">
                {field === "currentPassword" ? "Current Password" : field === "newPassword" ? "New Password" : "Confirm New Password"}
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  className="input pr-9"
                  value={pwForm[field]}
                  onChange={(e) => setPwForm((p) => ({ ...p, [field]: e.target.value }))}
                />
                {field === "confirm" && (
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    {showPw ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                )}
              </div>
            </div>
          ))}
          <button onClick={changePassword} disabled={saving} className="btn-primary px-5 py-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />} Change Password
          </button>
        </div>
      </Section>

      {/* 2FA Section with interactive controls */}
      <Section title="Two-Factor Authentication" description="Add an extra layer of security.">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${user?.twoFactorEnabled ? "bg-emerald-900/15 border-emerald-900/30" : "bg-surface-3 border-surface-4"}`}>
              <Smartphone size={16} className={user?.twoFactorEnabled ? "text-emerald-400" : "text-gray-500"} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200">Authenticator App</p>
              <p className="text-xs text-gray-500">{user?.twoFactorEnabled ? "Enabled — 2FA is protecting your account" : "Not enabled"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge text-xs ${user?.twoFactorEnabled ? "bg-emerald-900/20 text-emerald-400 border-emerald-900/30" : "bg-surface-3 text-gray-500 border-surface-4"}`}>
              {user?.twoFactorEnabled ? "Active" : "Disabled"}
            </span>
            {user?.twoFactorEnabled ? (
              <button onClick={() => setShowDisableModal(true)} className="btn-ghost text-xs px-3 py-1.5 text-accent-red">
                Disable
              </button>
            ) : (
              <button onClick={handleEnable2FA} className="btn-primary text-xs px-3 py-1.5">
                Enable 2FA
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-gray-600">
          Use an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator to generate time-based codes.
        </p>
      </Section>

      {/* 2FA Enable Modal */}
      {showSetupModal && <TwoFactorSetupModal onClose={() => setShowSetupModal(false)} onEnabled={refreshUser} />}

      {/* 2FA Disable Modal */}
      {showDisableModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDisableModal(false)}>
          <div className="bg-surface-1 border border-surface-4 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-white mb-2">Disable 2FA</h3>
            <p className="text-sm text-gray-400 mb-4">Enter your current authenticator code to confirm.</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              className="input text-center text-xl tracking-[0.5em] font-mono w-full mb-4"
              value={disableToken}
              onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, ""))}
            />
            <div className="flex gap-3">
              <button onClick={() => { setShowDisableModal(false); setDisableToken(""); }} className="btn-ghost flex-1">
                Cancel
              </button>
              <button onClick={handleDisable2FA} disabled={twoFALoading || disableToken.length !== 6} className="btn-danger flex-1 justify-center">
                {twoFALoading ? <Loader2 size={14} className="animate-spin" /> : "Disable"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Section title="Sessions" description="You are logged in on this device.">
        <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg border border-brand/20">
          <div className="w-8 h-8 rounded-lg bg-brand/15 border border-brand/25 flex items-center justify-center">
            <Shield size={14} className="text-brand-glow" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-200 font-medium">Current Session</p>
            <p className="text-xs text-gray-500">This browser · {new Date().toLocaleDateString()}</p>
          </div>
          <button
            onClick={() => { localStorage.removeItem("token"); window.location.href = "/login"; }}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-accent-red transition-colors"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </Section>

      <div className="mt-6">
        <DeviceManagement />
      </div>
    </div>
  );
}

// ── TwoFactorSetupModal (QR + verification) ──────────────────────────────────
function TwoFactorSetupModal({ onClose, onEnabled }) {
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

// ─────────────────────────────────────────────────────────────────────────────
//  Notifications Tab
// ─────────────────────────────────────────────────────────────────────────────
function NotificationsTab({ user, refreshUser }) {
  const [prefs, setPrefs] = useState({
    emailOnDownload:       user?.notificationPrefs?.emailOnDownload       ?? false,
    emailOnShare:          user?.notificationPrefs?.emailOnShare          ?? true,
    emailOnFileRequest:    user?.notificationPrefs?.emailOnFileRequest    ?? true,
    emailOnLogin:          user?.notificationPrefs?.emailOnLogin          ?? false,
    emailWeeklySummary:    user?.notificationPrefs?.emailWeeklySummary    ?? false,
    inAppActivity:         user?.notificationPrefs?.inAppActivity         ?? true,
    inAppAnnouncements:    user?.notificationPrefs?.inAppAnnouncements    ?? true,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setPrefs((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/api/users/me/notification-prefs", prefs);
      await refreshUser();
      toast.success("Notification preferences saved.");
    } catch { toast.error("Failed to save preferences."); }
    finally { setSaving(false); }
  };

  const EMAIL_PREFS = [
    { key: "emailOnDownload",    label: "File downloaded",      desc: "Email when someone downloads your shared file" },
    { key: "emailOnShare",       label: "File shared",          desc: "Confirmation when you create a share link"     },
    { key: "emailOnFileRequest", label: "File request submission", desc: "Email when someone submits files to your request" },
    { key: "emailOnLogin",       label: "New login detected",   desc: "Email when your account is accessed from a new device" },
    { key: "emailWeeklySummary", label: "Weekly activity summary", desc: "A weekly digest of your vault activity" },
  ];

  const INAPP_PREFS = [
    { key: "inAppActivity",      label: "Live activity feed",   desc: "Real-time updates in the sidebar activity feed" },
    { key: "inAppAnnouncements", label: "System announcements", desc: "Admin broadcast messages shown in the app"     },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <Section title="Email Notifications" description="Control when VaultFS sends you emails.">
        <div className="divide-y divide-surface-3">
          {EMAIL_PREFS.map(({ key, label, desc }) => (
            <Toggle key={key} label={label} description={desc} value={prefs[key]} onChange={(v) => set(key, v)} />
          ))}
        </div>
      </Section>

      <Section title="In-App Notifications" description="Control real-time in-app notifications.">
        <div className="divide-y divide-surface-3">
          {INAPP_PREFS.map(({ key, label, desc }) => (
            <Toggle key={key} label={label} description={desc} value={prefs[key]} onChange={(v) => set(key, v)} />
          ))}
        </div>
      </Section>

      <button onClick={save} disabled={saving} className="btn-primary px-5 py-2.5">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Save Preferences
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Appearance Tab
// ─────────────────────────────────────────────────────────────────────────────
function AppearanceTab() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const options = [
    {
      id: "system",
      label: "System",
      description: `Match your device automatically. Currently ${resolvedTheme}.`,
      icon: Monitor,
    },
    {
      id: "light",
      label: "Light",
      description: "Use the brighter interface everywhere.",
      icon: Sun,
    },
    {
      id: "dark",
      label: "Dark",
      description: "Keep the darker look across the app.",
      icon: Moon,
    },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <Section title="Appearance" description="Choose how VaultFS should handle light and dark mode.">
        <div className="grid gap-3 sm:grid-cols-3">
          {options.map(({ id, label, description, icon: Icon }) => {
            const selected = theme === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                aria-pressed={selected}
                className={`text-left rounded-xl border p-4 transition-all ${
                  selected
                    ? "border-brand/30 bg-brand/10 shadow-glow-sm"
                    : "border-surface-4 bg-surface-2 hover:border-brand/30 hover:bg-surface-1"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                    selected ? "border-brand/25 bg-brand/15" : "border-surface-4 bg-surface-3"
                  }`}>
                    <Icon size={17} className={selected ? "text-brand-glow" : "text-gray-500"} />
                  </div>
                  {selected && <span className="badge bg-brand/15 border border-brand/25 text-brand-glow">Active</span>}
                </div>
                <p className="mt-4 text-sm font-semibold text-white">{label}</p>
                <p className="mt-1 text-xs text-gray-500 leading-5">{description}</p>
              </button>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main SettingsPage
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "profile",       label: "Profile",       icon: User      },
  { id: "security",      label: "Security",      icon: Lock      },
  { id: "appearance",    label: "Appearance",    icon: Monitor   },
  { id: "notifications", label: "Notifications", icon: Bell      },
  { id: "webhooks",      label: "Webhooks",      icon: Webhook   },
];

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setTab] = useState("profile");

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <EmailVerificationBanner />

      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center">
          <Settings size={16} className="text-brand-glow" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl text-white">Settings</h1>
          <p className="text-xs text-gray-500">Manage your account, security, and integrations</p>
        </div>
      </div>

      <div className="flex gap-6">
        <nav className="w-44 flex-shrink-0 space-y-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? "bg-brand/10 text-brand-glow border border-brand/20"
                  : "text-gray-400 hover:text-white hover:bg-surface-3"
              }`}
            >
              <Icon size={14} className={activeTab === id ? "text-brand-glow" : "text-gray-500"} />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0 animate-fade-up">
          {activeTab === "profile"       && <ProfileTab       user={user} refreshUser={refreshUser} />}
          {activeTab === "security"      && <SecurityTab      user={user} refreshUser={refreshUser} />}
          {activeTab === "appearance"    && <AppearanceTab />}
          {activeTab === "notifications" && <NotificationsTab user={user} refreshUser={refreshUser} />}
          {activeTab === "webhooks"      && <WebhooksTab />}
        </div>
      </div>
    </div>
  );
}