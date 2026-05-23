import { useState } from "react";
import {
  Share2, Copy, Check, X, Lock, Clock, Download, Eye,
  EyeOff, Loader2, Infinity,
} from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

export default function AdvancedShareModal({ file, onClose }) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareResult, setResult] = useState(null);

  const [expiresIn, setExpiresIn] = useState(24);
  const [maxDL, setMaxDL] = useState("");
  const [password, setPassword] = useState("");
  const [viewOnly, setViewOnly] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied!");
    } catch {
      toast.error("Copy failed — please copy manually.");
    }
  };

  const createAdvancedLink = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post(`/api/files/${file._id}/share`, {
        expiresIn: expiresIn ? expiresIn * 3600 : null,
        maxDownloads: maxDL ? parseInt(maxDL) : null,
        password: password || undefined,
        viewOnly,
      });
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create share link.");
    } finally {
      setLoading(false);
    }
  };

  const EXPIRY_OPTIONS = [
    { label: "1 hour", value: 1 },
    { label: "6 hours", value: 6 },
    { label: "24 hours", value: 24 },
    { label: "7 days", value: 168 },
    { label: "30 days", value: 720 },
    { label: "Never", value: 0 },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 border border-surface-4 rounded-2xl w-full max-w-md shadow-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/15 border border-brand/25 flex items-center justify-center">
              <Share2 size={15} className="text-brand-glow" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-sm">Share File</h3>
              <p className="text-[11px] text-gray-500 truncate max-w-[200px]">{file.originalName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!shareResult ? (
            <div className="space-y-4">
              {/* Expiry */}
              <div>
                {/* ✅ FIX 1: removed 'block', kept 'flex' — both set display, they conflict */}
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-2">
                  <Clock size={11} /> Link Expiry
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {EXPIRY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setExpiresIn(opt.value)}
                      className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                        expiresIn === opt.value
                          ? "bg-brand/15 border-brand/30 text-brand-glow"
                          : "bg-surface-2 border-surface-4 text-gray-400 hover:text-white"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max downloads */}
              <div>
                {/* ✅ FIX 2: removed 'block', kept 'flex' */}
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                  <Download size={11} /> Download Limit
                  <span className="text-gray-600 font-normal">(leave empty for unlimited)</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    placeholder="e.g. 5"
                    className="input pr-9"
                    value={maxDL}
                    onChange={(e) => setMaxDL(e.target.value)}
                  />
                  <Infinity size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600" />
                </div>
              </div>

              {/* Password */}
              <div>
                {/* ✅ FIX 3: removed 'block', kept 'flex' */}
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-1.5">
                  <Lock size={11} /> Link Password
                  <span className="text-gray-600 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Optional password"
                    className="input pr-9"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {showPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>

              {/* View only toggle */}
              <div className="flex items-center justify-between p-3 bg-surface-2 rounded-lg border border-surface-4">
                <div className="flex items-center gap-2.5">
                  <Eye size={14} className="text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-200 font-medium">View Only</p>
                    <p className="text-[11px] text-gray-500">Recipient cannot download the file</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={!!viewOnly}
                    onChange={(e) => setViewOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-surface-5 bg-surface-3 accent-brand cursor-pointer"
                  />
                  <span className="text-xs text-gray-500">{viewOnly ? "On" : "Off"}</span>
                </label>
              </div>

              {/* Summary */}
              <div className="card p-3 text-xs text-gray-500 space-y-1">
                <p className="flex items-center gap-1.5">
                  <Clock size={10} className="text-gray-600" />
                  {expiresIn ? `Expires in ${EXPIRY_OPTIONS.find(o => o.value === expiresIn)?.label}` : "Never expires"}
                </p>
                <p className="flex items-center gap-1.5">
                  <Download size={10} className="text-gray-600" />
                  {maxDL ? `Max ${maxDL} download(s)` : "Unlimited downloads"}
                </p>
                <p className="flex items-center gap-1.5">
                  <Lock size={10} className="text-gray-600" />
                  {password ? "Password protected" : "No password"}
                </p>
                <p className="flex items-center gap-1.5">
                  {viewOnly ? <EyeOff size={10} className="text-gray-600" /> : <Eye size={10} className="text-gray-600" />}
                  {viewOnly ? "View only (no download)" : "Download allowed"}
                </p>
              </div>

              <button
                onClick={createAdvancedLink}
                disabled={loading}
                className="btn-primary w-full justify-center"
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Creating link…</>
                  : <><Share2 size={14} /> Create Share Link</>
                }
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-fade-up">
              <div className="w-12 h-12 rounded-2xl bg-emerald-900/20 border border-emerald-900/30 flex items-center justify-center mx-auto">
                <Check size={22} className="text-emerald-400" />
              </div>
              <p className="text-center text-sm font-medium text-white">Share link created!</p>

              <div className="flex gap-2">
                <input
                  readOnly
                  value={shareResult.url}
                  className="input text-xs font-mono flex-1"
                />
                <button
                  onClick={() => copyUrl(shareResult.url)}
                  className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border transition-all ${
                    copied
                      ? "bg-emerald-900/20 border-emerald-900/30 text-emerald-400"
                      : "bg-surface-3 border-surface-4 text-gray-400 hover:text-white"
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {shareResult.expiresAt && (
                  <div className="card p-2 text-center">
                    <Clock size={12} className="text-brand-glow mx-auto mb-1" />
                    <p className="text-gray-500">Expires</p>
                    <p className="text-gray-300 font-medium text-[11px]">
                      {new Date(shareResult.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {shareResult.maxDownloads && (
                  <div className="card p-2 text-center">
                    <Download size={12} className="text-brand-glow mx-auto mb-1" />
                    <p className="text-gray-500">Downloads</p>
                    <p className="text-gray-300 font-medium">{shareResult.maxDownloads} max</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => { setResult(null); setPassword(""); setMaxDL(""); setViewOnly(false); }}
                className="btn-ghost w-full justify-center text-sm"
              >
                Create Another Link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}