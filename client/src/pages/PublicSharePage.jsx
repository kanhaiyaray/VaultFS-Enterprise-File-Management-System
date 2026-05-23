import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Download, Eye, Lock, FileText, Loader2, AlertCircle, CheckCircle2,
  Clock, Shield, Zap, ExternalLink, Image, Film, Music,
} from "lucide-react";
import api from "../utils/api";
import { formatBytes, getFileIcon } from "../utils/helpers";
import toast from "react-hot-toast";

/**
 * PublicSharePage — renders at /s/:token
 * Handles: password gate, view-only, download limit display, expiry check.
 *
 * Add to App.jsx:
 *   import PublicSharePage from "./pages/PublicSharePage";
 *   <Route path="/s/:token" element={<PublicSharePage />} />
 *
 * Add to server/routes/files.js:
 *   router.get("/share/:token",          getShareInfo);   // public
 *   router.post("/share/:token/access",  accessShare);    // verify password + serve
 */

// ── Sub-components ────────────────────────────────────────────────────────────

function PreviewPane({ file, previewUrl }) {
  const mime = file.mimetype || "";

  if (mime.startsWith("image/")) {
    return (
      <div className="flex items-center justify-center bg-surface-0 rounded-xl border border-surface-4 overflow-hidden min-h-48 max-h-96">
        <img
          src={previewUrl}
          alt={file.originalName}
          className="max-w-full max-h-96 object-contain"
          onError={(e) => { e.target.style.display = "none"; }}
        />
      </div>
    );
  }

  if (mime.startsWith("video/")) {
    return (
      <div className="rounded-xl overflow-hidden border border-surface-4 bg-black">
        <video controls className="w-full max-h-72" src={previewUrl}>
          Your browser does not support video playback.
        </video>
      </div>
    );
  }

  if (mime.startsWith("audio/")) {
    return (
      <div className="card p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center flex-shrink-0">
          <Music size={22} className="text-brand-glow" />
        </div>
        <audio controls className="flex-1 h-10">
          <source src={previewUrl} type={mime} />
        </audio>
      </div>
    );
  }

  if (mime === "application/pdf") {
    return (
      <div className="rounded-xl overflow-hidden border border-surface-4" style={{ height: "480px" }}>
        <iframe src={`${previewUrl}#view=FitH`} className="w-full h-full" title="PDF Preview" />
      </div>
    );
  }

  // Generic icon
  return (
    <div className="flex flex-col items-center gap-3 py-10 card">
      <span className="text-6xl opacity-80">{getFileIcon(mime)}</span>
      <p className="text-sm text-gray-500">Preview not available for this file type.</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PublicSharePage() {
  const { token } = useParams();

  const [shareInfo,  setShareInfo]  = useState(null);   // public metadata
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [password,   setPassword]   = useState("");
  const [unlocking,  setUnlocking]  = useState(false);
  const [accessData, setAccessData] = useState(null);   // after password verified
  const [downloading, setDownloading] = useState(false);

  // Fetch public share metadata (no password needed for metadata)
  useEffect(() => {
    api.get(`/api/files/share/${token}`)
      .then(({ data }) => setShareInfo(data))
      .catch((err) => {
        const msg = err.response?.data?.message;
        if (msg?.includes("expired") || msg?.includes("limit")) {
          setError({ type: "expired", message: msg });
        } else if (err.response?.status === 404) {
          setError({ type: "notfound", message: "This share link doesn't exist or has been revoked." });
        } else {
          setError({ type: "generic", message: msg || "Failed to load shared file." });
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  // If no password required, auto-unlock
  useEffect(() => {
    if (shareInfo && !shareInfo.passwordProtected) {
      setAccessData({ file: shareInfo.file, downloadUrl: shareInfo.downloadUrl, viewOnly: shareInfo.viewOnly });
    }
  }, [shareInfo]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password) return;
    setUnlocking(true);
    try {
      const { data } = await api.post(`/api/files/share/${token}/access`, { password });
      setAccessData(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Incorrect password.");
    } finally {
      setUnlocking(false);
    }
  };

  const handleDownload = async () => {
    if (!accessData?.downloadUrl) return;
    setDownloading(true);
    try {
      const response = await fetch(accessData.downloadUrl);
      if (!response.ok) throw new Error("Download failed.");
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = accessData.file.originalName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Download started!");
    } catch (err) {
      toast.error(err.message || "Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 grid-bg flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-brand-glow mx-auto" />
          <p className="text-gray-500 text-sm">Loading shared file…</p>
        </div>
      </div>
    );
  }

  // ── Error states ─────────────────────────────────────────────────────────────
  if (error) {
    const icons = {
      expired:  <Clock size={32} className="text-accent-amber mx-auto" />,
      notfound: <AlertCircle size={32} className="text-gray-500 mx-auto" />,
      generic:  <AlertCircle size={32} className="text-accent-red mx-auto" />,
    };
    return (
      <div className="min-h-screen bg-surface-0 grid-bg flex items-center justify-center p-4">
        <div className="card p-8 max-w-sm w-full text-center space-y-4 animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-surface-3 border border-surface-4 flex items-center justify-center mx-auto">
            {icons[error.type]}
          </div>
          <h2 className="font-display font-bold text-xl text-white">
            {error.type === "expired" ? "Link Expired" :
             error.type === "notfound" ? "Link Not Found" : "Access Denied"}
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed">{error.message}</p>
          <Link to="/" className="btn-ghost w-full justify-center text-sm">
            <Zap size={13} /> VaultFS Home
          </Link>
        </div>
      </div>
    );
  }

  const file      = accessData?.file || shareInfo?.file;
  const viewOnly  = accessData?.viewOnly ?? shareInfo?.viewOnly;
  const needsPass = shareInfo?.passwordProtected && !accessData;

  return (
    <div className="min-h-screen bg-surface-0 grid-bg flex flex-col">
      {/* Top bar */}
      <header className="border-b border-surface-3 bg-surface-1 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand/20 border border-brand/30 flex items-center justify-center">
            <Zap size={14} className="text-brand-glow" />
          </div>
          <span className="font-display font-bold text-white text-sm">VaultFS</span>
        </Link>
        <p className="text-xs text-gray-500 flex items-center gap-1.5">
          <Shield size={11} /> Secure file share
        </p>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-4 animate-fade-up">

          {/* ── Password gate ────────────────────────────────────────── */}
          {needsPass && (
            <div className="card p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center flex-shrink-0">
                  <Lock size={18} className="text-brand-glow" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-white">Password Protected</h2>
                  <p className="text-xs text-gray-500">
                    {file ? `"${file.originalName}"` : "This file"} requires a password to access.
                  </p>
                </div>
              </div>

              {file && (
                <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg border border-surface-4">
                  <span className="text-2xl">{getFileIcon(file.mimetype)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{file.originalName}</p>
                    <p className="text-xs text-gray-600 font-mono">{formatBytes(file.size)}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleUnlock} className="space-y-3">
                <input
                  type="password"
                  className="input"
                  placeholder="Enter share password…"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                />
                <button type="submit" disabled={unlocking || !password} className="btn-primary w-full justify-center">
                  {unlocking ? <><Loader2 size={14} className="animate-spin" /> Verifying…</> : <><Lock size={14} /> Unlock File</>}
                </button>
              </form>
            </div>
          )}

          {/* ── File access panel ────────────────────────────────────── */}
          {accessData && (
            <div className="space-y-4">
              {/* File card */}
              <div className="card p-5">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-surface-2 border border-surface-4 flex items-center justify-center flex-shrink-0 text-3xl">
                    {getFileIcon(file?.mimetype)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="font-display font-bold text-white text-lg leading-tight truncate">
                      {file?.originalName}
                    </h1>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500 font-mono">{formatBytes(file?.size)}</span>
                      <span className="text-xs text-gray-600">{file?.mimetype?.split("/")[1]?.toUpperCase()}</span>
                      {viewOnly && (
                        <span className="badge bg-amber-900/20 text-amber-300 border border-amber-900/30 text-[10px]">
                          <Eye size={9} className="mr-1" /> View Only
                        </span>
                      )}
                    </div>

                    {/* Share meta */}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {shareInfo?.expiresAt && (
                        <span className="text-[11px] text-gray-600 flex items-center gap-1">
                          <Clock size={10} />
                          Expires {new Date(shareInfo.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                      {shareInfo?.downloadsRemaining !== undefined && (
                        <span className="text-[11px] text-gray-600 flex items-center gap-1">
                          <Download size={10} />
                          {shareInfo.downloadsRemaining} download{shareInfo.downloadsRemaining !== 1 ? "s" : ""} left
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-4">
                  {!viewOnly ? (
                    <button
                      onClick={handleDownload}
                      disabled={downloading}
                      className="btn-primary flex-1 justify-center py-2.5"
                    >
                      {downloading
                        ? <><Loader2 size={15} className="animate-spin" /> Downloading…</>
                        : <><Download size={15} /> Download File</>
                      }
                    </button>
                  ) : (
                    <div className="flex-1 flex items-center gap-2 p-3 bg-amber-900/10 border border-amber-900/20 rounded-lg">
                      <Eye size={14} className="text-amber-400 flex-shrink-0" />
                      <p className="text-xs text-amber-300/80">
                        This file is shared in view-only mode. Downloading is disabled.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview */}
              {accessData.previewUrl && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wider flex items-center gap-1.5">
                    <Eye size={11} /> Preview
                  </p>
                  <PreviewPane file={file} previewUrl={accessData.previewUrl} />
                </div>
              )}

              {/* Description */}
              {file?.description && (
                <div className="card p-4">
                  <p className="text-xs text-gray-500 font-medium mb-1.5">Description</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{file.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="text-center pt-2">
            <p className="text-xs text-gray-600">
              Shared via{" "}
              <Link to="/" className="text-brand-glow hover:underline">VaultFS</Link>
              {" "}— Secure cloud file management
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
