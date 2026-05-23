import { useState, useEffect, useRef } from "react";
import {
  X, Download, Star, StarOff, Share2, Trash2, Edit3, Check,
  ChevronLeft, ChevronRight, ExternalLink, History, Activity,
  Tag, Info, Eye, Lock, Loader2, Copy, ZoomIn, ZoomOut,
  RotateCw, Volume2, Maximize2,
} from "lucide-react";
import api from "../utils/api";
import { formatBytes, formatDate, getFileIcon } from "../utils/helpers";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

// ── Lazy-load all the new tab components ─────────────────────────────────────
import FileVersionHistory        from "./FileVersionHistory";
import FileActivityLog           from "./FileActivityLog";
import AdvancedShareModal        from "./AdvancedShareModal";
import { LabelPicker, LabelDot } from "./FileLabels";
import OfficePreview, { MIME_TYPES as OFFICE_MIMES } from "./OfficePreview";
import CodeAndMarkdownPreview, { detectLanguage } from "./CodeAndMarkdownPreview";

// ── Text-previewable extensions ───────────────────────────────────────────────
const TEXT_EXTS = new Set([
  "txt","md","mdx","js","jsx","ts","tsx","py","rb","go","rs","java","kt",
  "php","cs","cpp","c","h","sh","bash","sql","html","xml","css","scss",
  "json","yaml","yml","toml","env","dockerfile","graphql","tf","lua",
  "swift","dart","log","csv",
]);

function isTextFile(file) {
  if (!file) return false;
  const ext = file.originalName?.split(".").pop()?.toLowerCase();
  return TEXT_EXTS.has(ext) || file.mimetype?.startsWith("text/");
}

// ─────────────────────────────────────────────────────────────────────────────
//  Preview renderers
// ─────────────────────────────────────────────────────────────────────────────

function ImageViewer({ src, alt }) {
  const [scale, setScale]   = useState(1);
  const [rotate, setRotate] = useState(0);
  const zoom  = (d) => setScale((s) => Math.max(0.25, Math.min(4, s + d)));
  const reset = () => { setScale(1); setRotate(0); };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="overflow-hidden rounded-xl border border-surface-4 bg-surface-0 relative w-full flex items-center justify-center"
           style={{ minHeight: 240, maxHeight: 520 }}>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[520px] object-contain transition-transform duration-200 select-none"
          style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
          draggable={false}
        />
      </div>
      {/* Image toolbar */}
      <div className="flex items-center gap-1 bg-surface-2 border border-surface-4 rounded-lg px-2 py-1.5">
        <button onClick={() => zoom(-0.25)} className="p-1 text-gray-500 hover:text-white transition-colors" title="Zoom out"><ZoomOut size={13} /></button>
        <button onClick={reset} className="px-2 py-0.5 text-xs text-gray-400 hover:text-white font-mono min-w-[44px] text-center transition-colors">{Math.round(scale * 100)}%</button>
        <button onClick={() => zoom(0.25)} className="p-1 text-gray-500 hover:text-white transition-colors" title="Zoom in"><ZoomIn size={13} /></button>
        <div className="w-px h-4 bg-surface-4 mx-1" />
        <button onClick={() => setRotate((r) => r + 90)} className="p-1 text-gray-500 hover:text-white transition-colors" title="Rotate"><RotateCw size={13} /></button>
      </div>
    </div>
  );
}

function VideoPlayer({ src, file }) {
  return (
    <div className="rounded-xl overflow-hidden border border-surface-4 bg-black">
      <video controls className="w-full max-h-[480px]" src={src} preload="metadata">
        Your browser doesn't support video playback.
      </video>
    </div>
  );
}

function AudioPlayer({ src, file }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center flex-shrink-0">
        <Volume2 size={24} className="text-brand-glow" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate mb-2">{file.originalName}</p>
        <audio controls className="w-full h-9">
          <source src={src} type={file.mimetype} />
        </audio>
      </div>
    </div>
  );
}

function PdfViewer({ src }) {
  return (
    <div className="rounded-xl overflow-hidden border border-surface-4" style={{ height: 560 }}>
      <iframe src={`${src}#view=FitH&toolbar=1`} className="w-full h-full" title="PDF Viewer" />
    </div>
  );
}

function TextFetcher({ file, downloadUrl }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!downloadUrl) return;
    fetch(downloadUrl)
      .then((r) => r.text())
      .then(setContent)
      .catch(() => setContent("// Failed to load file content."))
      .finally(() => setLoading(false));
  }, [downloadUrl]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-brand-glow" /></div>;
  return <CodeAndMarkdownPreview file={file} content={content} downloadUrl={downloadUrl} />;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Rename inline
// ─────────────────────────────────────────────────────────────────────────────
function InlineRename({ file, onDone }) {
  const [name, setName] = useState(file.originalName);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || name === file.originalName) return onDone();
    setSaving(true);
    try {
      await api.put(`/api/files/${file._id}`, { originalName: name.trim() });
      toast.success("Renamed.");
      onDone(name.trim());
    } catch { toast.error("Rename failed."); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <input
        autoFocus
        className="input text-sm flex-1"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") onDone(); }}
      />
      <button onClick={save} disabled={saving} className="btn-primary px-3 py-1.5 text-xs flex-shrink-0">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
      </button>
      <button onClick={onDone} className="btn-ghost px-2 py-1.5 flex-shrink-0"><X size={12} /></button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Info Tab
// ─────────────────────────────────────────────────────────────────────────────
function InfoTab({ file }) {
  const rows = [
    { label: "Original Name", value: file.originalName },
    { label: "Size",          value: formatBytes(file.size) },
    { label: "Type",          value: file.mimetype },
    { label: "Uploaded",      value: formatDate(file.createdAt) },
    { label: "Modified",      value: formatDate(file.updatedAt) },
    file.hash && { label: "SHA-256",  value: <span className="font-mono text-[10px] break-all">{file.hash}</span> },
    file.description && { label: "Description", value: file.description },
    file.tags?.length  && { label: "Tags",        value: file.tags.map((t) => `#${t}`).join("  ") },
    file.metadata?.width && { label: "Dimensions", value: `${file.metadata.width} × ${file.metadata.height}px` },
    file.metadata?.compressed && { label: "Compressed", value: `${formatBytes(file.metadata.originalSize)} → ${formatBytes(file.size)}` },
  ].filter(Boolean);

  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.label} className="flex items-start gap-3 py-2 border-b border-surface-3 last:border-0">
          <span className="text-xs text-gray-500 w-28 flex-shrink-0 pt-0.5">{r.label}</span>
          <span className="text-xs text-gray-300 flex-1 break-all">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main FilePreviewModal
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "preview",  label: "Preview",  icon: Eye      },
  { id: "info",     label: "Info",     icon: Info     },
  { id: "versions", label: "Versions", icon: History  },
  { id: "activity", label: "Activity", icon: Activity },
];

export default function FilePreviewModal({
  file: initialFile,
  files = [],          // full file list for prev/next nav
  onClose,
  onDelete,
  onStar,
  onRefresh,
  isOwner = true,
}) {
  const { user }            = useAuth();
  const [file, setFile]     = useState(initialFile);
  const [tab,  setTab]      = useState("preview");
  const [signedUrl, setUrl] = useState(null);
  // BUG FIX: separate blob URL so media previews include auth
  const [blobUrl,      setBlobUrl]    = useState(null);
  const [urlLoading,   setUrlLoading] = useState(false);
  const [renaming,     setRenaming]   = useState(false);
  const [showShare,    setShowShare]  = useState(false);
  const [deleting,     setDeleting]   = useState(false);
  const [starring,     setStarring]   = useState(false);

  const currentIdx = files.findIndex((f) => f._id === file._id);
  const hasPrev    = currentIdx > 0;
  const hasNext    = currentIdx < files.length - 1;

  // BUG FIX: fetch file content with JWT for media types so <img>/<video>/<iframe>
  // don't break — plain src= attributes never send Authorization headers.
  useEffect(() => {
    if (!file?._id) return;
    setUrl(null);
    setBlobUrl(null);
    setUrlLoading(true);

    const mime = file.mimetype || "";
    const isMedia =
      mime.startsWith("image/") ||
      mime.startsWith("video/") ||
      mime.startsWith("audio/") ||
      mime === "application/pdf";

    if (isMedia) {
      api.get(`/api/files/download/${file._id}`, { responseType: "blob" })
        .then(({ data }) => {
          const url = URL.createObjectURL(data);
          setBlobUrl(url);
          setUrl(url);
        })
        .catch(() => {})
        .finally(() => setUrlLoading(false));
    } else {
      // text / office files fetch their own content separately
      api.get(`/api/files/${file._id}/signed-url`)
        .then(({ data }) => setUrl(data.url || data.signedUrl))
        .catch(() => {})
        .finally(() => setUrlLoading(false));
    }

    return () => {
      // revoke blob URL to free memory when switching files
      setBlobUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return null; });
    };
  }, [file?._id]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft"  && hasPrev) setFile(files[currentIdx - 1]);
      if (e.key === "ArrowRight" && hasNext) setFile(files[currentIdx + 1]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, hasPrev, hasNext, currentIdx, files]);

  // ✅ FIXED: Removed confirm() dialog
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/files/${file._id}`);
      toast.success("File deleted.");
      onDelete?.(file._id);
      onClose();
    } catch { toast.error("Delete failed."); }
    finally { setDeleting(false); }
  };

  const handleStar = async () => {
    setStarring(true);
    try {
      if (file.isStarred) {
        await api.delete(`/api/files/${file._id}/star`);
        setFile((f) => ({ ...f, isStarred: false }));
        toast.success("Unstarred.");
      } else {
        await api.post(`/api/files/${file._id}/star`);
        setFile((f) => ({ ...f, isStarred: true }));
        toast.success("Starred!");
      }
      onStar?.(file._id);
    } catch { toast.error("Failed."); }
    finally { setStarring(false); }
  };

  // BUG FIX: Use axios (which carries the JWT) to download as blob.
  // Plain <a href> clicks do NOT include the Authorization header,
  // so private file downloads always returned 403.
  const handleDownload = async () => {
    try {
      toast.loading("Preparing download…", { id: "dl" });
      const response = await api.get(`/api/files/download/${file._id}`, {
        responseType: "blob",
      });
      toast.dismiss("dl");
      const blobUrl = URL.createObjectURL(response.data);
      const a = document.createElement("a");
      a.href     = blobUrl;
      a.download = file.originalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast.dismiss("dl");
      toast.error("Download failed.");
    }
  };

  const handleRenameComplete = (newName) => {
    if (newName) {
      setFile((f) => ({ ...f, originalName: newName }));
      onRefresh?.();
    }
    setRenaming(false);
  };

  // ── Render preview based on file type ──────────────────────────────────────
  const renderPreview = () => {
    if (urlLoading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-brand-glow" /></div>;
    if (!signedUrl && !isTextFile(file) && !OFFICE_MIMES[file.mimetype]) {
      return (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="text-6xl">{getFileIcon(file.mimetype)}</span>
          <p className="text-gray-500 text-sm">Preview not available for this file type.</p>
          <button onClick={handleDownload} className="btn-primary px-4 py-2">
            <Download size={14} /> Download to view
          </button>
        </div>
      );
    }

    const mime = file.mimetype || "";
    if (mime.startsWith("image/"))  return <ImageViewer src={signedUrl} alt={file.originalName} />;
    if (mime.startsWith("video/"))  return <VideoPlayer src={signedUrl} file={file} />;
    if (mime.startsWith("audio/"))  return <AudioPlayer src={signedUrl} file={file} />;
    if (mime === "application/pdf") return <PdfViewer src={signedUrl} />;
    if (OFFICE_MIMES[mime])         return <OfficePreview file={file} downloadUrl={signedUrl} />;
    if (isTextFile(file))           return <TextFetcher file={file} downloadUrl={signedUrl} />;

    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="text-6xl">{getFileIcon(mime)}</span>
        <p className="text-gray-400 text-sm">No preview available</p>
        <button onClick={handleDownload} disabled={!signedUrl} className="btn-primary px-4 py-2">
          <Download size={14} /> Download
        </button>
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-surface-1 border border-surface-4 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-3 flex-shrink-0">
            <span className="text-2xl flex-shrink-0">{getFileIcon(file.mimetype)}</span>

            {renaming ? (
              <InlineRename file={file} onDone={handleRenameComplete} />
            ) : (
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-white text-base truncate" title={file.originalName}>
                  {file.originalName}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-500 font-mono">{formatBytes(file.size)}</span>
                  <LabelDot labels={file.labels} />
                  {file.isStarred && <Star size={11} className="text-yellow-400 fill-yellow-400" />}
                </div>
              </div>
            )}

            {/* Header actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isOwner && <LabelPicker file={file} onUpdate={(updated) => setFile(updated)} />}

              <button
                onClick={handleStar}
                disabled={starring}
                title={file.isStarred ? "Unstar" : "Star"}
                className="p-2 rounded-lg text-gray-500 hover:text-yellow-400 hover:bg-yellow-900/10 transition-all"
              >
                {file.isStarred ? <Star size={15} className="fill-yellow-400 text-yellow-400" /> : <Star size={15} />}
              </button>

              {isOwner && (
                <button
                  onClick={() => setRenaming(!renaming)}
                  title="Rename"
                  className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-surface-3 transition-all"
                >
                  <Edit3 size={15} />
                </button>
              )}

              <button
                onClick={() => setShowShare(true)}
                title="Share"
                className="p-2 rounded-lg text-gray-500 hover:text-brand-glow hover:bg-brand/10 transition-all"
              >
                <Share2 size={15} />
              </button>

              <button
                onClick={handleDownload}
                disabled={!signedUrl}
                title="Download"
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-surface-3 transition-all"
              >
                <Download size={15} />
              </button>

              {isOwner && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  title="Delete"
                  className="p-2 rounded-lg text-gray-500 hover:text-accent-red hover:bg-red-900/10 transition-all"
                >
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              )}

              {/* Prev / Next */}
              {files.length > 1 && (
                <>
                  <div className="w-px h-5 bg-surface-4 mx-1" />
                  <button
                    onClick={() => setFile(files[currentIdx - 1])}
                    disabled={!hasPrev}
                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-surface-3 transition-all disabled:opacity-30"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-xs text-gray-600 font-mono">{currentIdx + 1}/{files.length}</span>
                  <button
                    onClick={() => setFile(files[currentIdx + 1])}
                    disabled={!hasNext}
                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-surface-3 transition-all disabled:opacity-30"
                  >
                    <ChevronRight size={15} />
                  </button>
                </>
              )}

              <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-surface-3 transition-all ml-1">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Tabs ──────────────────────────────────────────────────── */}
          <div className="flex gap-0.5 px-5 pt-3 border-b border-surface-3 flex-shrink-0 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap -mb-px ${
                  tab === id
                    ? "border-brand text-brand-glow"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* ── Tab Content ───────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-5">
            {tab === "preview"  && <div className="animate-fade-up">{renderPreview()}</div>}
            {tab === "info"     && <InfoTab file={file} />}
            {tab === "versions" && (
              <FileVersionHistory
                fileId={file._id}
                onRestore={() => { onRefresh?.(); onClose(); }}
              />
            )}
            {tab === "activity" && (
              <FileActivityLog fileId={file._id} isOwner={isOwner} />
            )}
          </div>
        </div>
      </div>

      {/* Share modal */}
      {showShare && (
        <AdvancedShareModal file={file} onClose={() => setShowShare(false)} />
      )}
    </>
  );
}