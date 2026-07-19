import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  History,
  Info,
  Loader2,
  Palette,
  Share2,
  Star,
  Trash2,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useActionHistory } from "../context/ActionHistoryContext";
import { formatBytes, formatDate, getFileIcon } from "../utils/helpers";
import FileVersionHistory from "./FileVersionHistory";
import FileActivityLog from "./FileActivityLog";
import AdvancedShareModal from "./AdvancedShareModal";
import { LabelDot, LabelPicker } from "./FileLabels";
import OfficePreview, { MIME_TYPES as OFFICE_MIMES } from "./OfficePreview";
import CodeAndMarkdownPreview from "./CodeAndMarkdownPreview";
import EbookPreview from "./EbookPreview";

const TEXT_EXTS = new Set([
  "txt", "md", "mdx", "js", "jsx", "ts", "tsx", "py", "rb", "go", "rs", "java", "kt",
  "php", "cs", "cpp", "c", "h", "sh", "bash", "sql", "html", "xml", "css", "scss",
  "json", "yaml", "yml", "toml", "env", "dockerfile", "graphql", "tf", "lua",
  "swift", "dart", "log", "csv",
]);

const FILE_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#22c55e", "#14b8a6", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"];

function isTextFile(file) {
  const ext = file?.originalName?.split(".").pop()?.toLowerCase();
  return TEXT_EXTS.has(ext) || file?.mimetype?.startsWith("text/");
}

function isEpubFile(file) {
  const ext = file?.originalName?.split(".").pop()?.toLowerCase();
  return ext === "epub" || file?.mimetype === "application/epub+zip";
}

function ImageViewer({ src, alt }) {
  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0);

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        className="overflow-hidden rounded-xl border border-surface-4 bg-surface-0 relative w-full flex items-center justify-center" 
        style={{ minHeight: 240, maxHeight: 520 }}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[520px] object-contain transition-transform duration-200 select-none"
          style={{ transform: `scale(${scale}) rotate(${rotate}deg)` }}
          draggable={false}
        />
      </div>
      <div className="flex items-center gap-1 bg-surface-2 border border-surface-4 rounded-lg px-2 py-1.5">
        <button 
          onClick={() => setScale((value) => Math.max(0.25, value - 0.25))} 
          className="p-1 text-gray-500 hover:text-white transition-colors"
        >
          <ZoomOut size={13} />
        </button>
        <button 
          onClick={() => { setScale(1); setRotate(0); }} 
          className="px-2 py-0.5 text-xs text-gray-400 hover:text-white font-mono min-w-[44px] text-center transition-colors"
        >
          {Math.round(scale * 100)}%
        </button>
        <button 
          onClick={() => setScale((value) => Math.min(4, value + 0.25))} 
          className="p-1 text-gray-500 hover:text-white transition-colors"
        >
          <ZoomIn size={13} />
        </button>
        <div className="w-px h-4 bg-surface-4 mx-1" />
        <button 
          onClick={() => setRotate((value) => value + 90)} 
          className="p-1 text-gray-500 hover:text-white transition-colors"
        >
          <RotateCw size={13} />
        </button>
      </div>
    </div>
  );
}

function AudioPlayer({ src, file, onError }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-14 h-14 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center flex-shrink-0">
        <Volume2 size={24} className="text-brand-glow" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate mb-2">{file.originalName}</p>
        <audio controls className="w-full h-9" onError={onError}>
          <source src={src} type={file.mimetype} />
        </audio>
      </div>
    </div>
  );
}

function PdfViewer({ src, onError }) {
  return (
    <div className="rounded-xl overflow-hidden border border-surface-4 bg-white" style={{ height: 560 }}>
      <iframe
        src={`${src}#view=FitH&toolbar=1`}
        className="w-full h-full"
        title="PDF Viewer"
        onError={onError}
      />
    </div>
  );
}

function BrowserFallbackViewer({ src, file }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden border border-surface-4 bg-surface-0" style={{ height: 560 }}>
        <iframe src={src} className="w-full h-full" title={file.originalName} />
      </div>
      <p className="text-xs text-gray-600">
        VaultFS is using the browser&apos;s built-in viewer for this file type.
      </p>
    </div>
  );
}

function TextFetcher({ file, downloadUrl }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!downloadUrl) return;
    let mounted = true;

    api.get(downloadUrl, { responseType: "text" })
      .then((response) => { 
        if (mounted) setContent(response.data); 
      })
      .catch(() => { 
        if (mounted) setContent("// Failed to load file content."); 
      })
      .finally(() => { 
        if (mounted) setLoading(false); 
      });

    return () => { mounted = false; };
  }, [downloadUrl]);

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-brand-glow" /></div>;
  }

  return <CodeAndMarkdownPreview file={file} content={content} downloadUrl={downloadUrl} />;
}

function InlineRename({ file, onDone }) {
  const [name, setName] = useState(file.originalName);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || name === file.originalName) {
      onDone();
      return;
    }

    setSaving(true);
    try {
      await api.put(`/api/files/${file._id}`, { originalName: name.trim() });
      toast.success("Renamed.");
      onDone(name.trim());
    } catch {
      toast.error("Rename failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-1 min-w-0">
      <input
        autoFocus
        className="input text-sm flex-1"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") save();
          if (event.key === "Escape") onDone();
        }}
      />
      <button onClick={save} disabled={saving} className="btn-primary px-3 py-1.5 text-xs flex-shrink-0">
        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
      </button>
      <button onClick={() => onDone()} className="btn-ghost px-2 py-1.5 flex-shrink-0">
        <X size={12} />
      </button>
    </div>
  );
}

function InfoTab({ file, organizerMeta }) {
  const rows = [
    { label: "Original Name", value: file.originalName },
    { label: "Size", value: formatBytes(file.size) },
    { label: "Type", value: file.mimetype },
    { label: "Uploaded", value: formatDate(file.createdAt) },
    { label: "Modified", value: formatDate(file.updatedAt) },
    file.description && { label: "Description", value: file.description },
    file.tags?.length && { label: "Tags", value: file.tags.map((tag) => `#${tag}`).join("  ") },
    organizerMeta?.aliases?.length && { label: "Aliases", value: organizerMeta.aliases.map((alias) => `@${alias}`).join("  ") },
    organizerMeta?.relationships?.length && { label: "Relationships", value: `${organizerMeta.relationships.length} linked file(s)` },
  ].filter(Boolean);

  return (
    <div className="space-y-1">
      {rows.map((row) => (
        <div key={row.label} className="flex items-start gap-3 py-2 border-b border-surface-3 last:border-0">
          <span className="text-xs text-gray-500 w-28 flex-shrink-0 pt-0.5">{row.label}</span>
          <span className="text-xs text-gray-300 flex-1 break-all">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function OrganizerTab({ file, files, organizerMeta, onOrganizerUpdate, onRefresh }) {
  const { pushAction } = useActionHistory();
  const [description, setDescription] = useState(file.description || "");
  const [aliasInput, setAliasInput] = useState("");

  useEffect(() => {
    setDescription(file.description || "");
  }, [file.description]);

  const relationships = organizerMeta?.relationships || [];
  const aliases = organizerMeta?.aliases || [];
  const relatedIds = new Set(relationships.map((item) => item.id));

  const saveDescription = async () => {
    try {
      const previous = file.description || "";
      await api.put(`/api/files/${file._id}`, { description });
      pushAction({
        undoLabel: "Description restored.",
        redoLabel: "Description changed again.",
        undo: async () => { await api.put(`/api/files/${file._id}`, { description: previous }); onRefresh?.(); },
        redo: async () => { await api.put(`/api/files/${file._id}`, { description }); onRefresh?.(); },
      });
      toast.success("Description updated.");
      onRefresh?.();
    } catch {
      toast.error("Failed to save description.");
    }
  };

  const setColor = (color) => {
    const previous = organizerMeta?.color || "";
    onOrganizerUpdate?.({ color });
    pushAction({
      undoLabel: "Color restored.",
      redoLabel: "Color applied again.",
      undo: async () => onOrganizerUpdate?.({ color: previous }),
      redo: async () => onOrganizerUpdate?.({ color }),
    });
  };

  const addAlias = () => {
    const alias = aliasInput.trim();
    if (!alias) return;
    if (aliases.includes(alias)) {
      toast.error("Alias already exists.");
      return;
    }

    const nextAliases = [...aliases, alias];
    onOrganizerUpdate?.({ aliases: nextAliases });
    setAliasInput("");
  };

  const removeAlias = (alias) => {
    onOrganizerUpdate?.({ aliases: aliases.filter((value) => value !== alias) });
  };

  const toggleRelationship = (relatedFile) => {
    const exists = relatedIds.has(relatedFile._id);
    const nextRelationships = exists
      ? relationships.filter((item) => item.id !== relatedFile._id)
      : [...relationships, { id: relatedFile._id, name: relatedFile.originalName }];
    onOrganizerUpdate?.({ relationships: nextRelationships });
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Color</p>
        <div className="flex flex-wrap gap-2">
          {FILE_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setColor(color)}
              className={`w-7 h-7 rounded-full transition-transform ${
                organizerMeta?.color === color ? "scale-110 ring-2 ring-white/30" : "hover:scale-105"
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</p>
          <button onClick={saveDescription} className="btn-ghost text-xs px-3 py-1.5">Save</button>
        </div>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="input min-h-[96px] text-sm"
          placeholder="Add a file description..."
        />
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Aliases and Shortcuts</p>
        <div className="flex gap-2 mb-3">
          <input
            value={aliasInput}
            onChange={(event) => setAliasInput(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") addAlias(); }}
            className="input text-sm flex-1"
            placeholder="invoice-q2 or client-brief"
          />
          <button onClick={addAlias} className="btn-primary px-3 py-2">Add</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {aliases.length ? aliases.map((alias) => (
            <button key={alias} onClick={() => removeAlias(alias)} className="px-2.5 py-1 rounded-lg text-xs bg-surface-3 border border-surface-4 text-brand-glow">
              @{alias}
            </button>
          )) : (
            <p className="text-xs text-gray-600">No aliases yet.</p>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Relationships</p>
        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
          {files.filter((item) => item._id !== file._id).slice(0, 20).map((relatedFile) => {
            const active = relatedIds.has(relatedFile._id);
            return (
              <button
                key={relatedFile._id}
                onClick={() => toggleRelationship(relatedFile)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-colors ${
                  active ? "bg-brand/10 border-brand/20 text-brand-glow" : "bg-surface-2 border-surface-4 text-gray-300 hover:text-white"
                }`}
              >
                <span className="text-lg">{getFileIcon(relatedFile.mimetype)}</span>
                <span className="flex-1 truncate text-sm">{relatedFile.originalName}</span>
                {active && <Check size={13} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: "preview", label: "Preview", icon: Eye },
  { id: "info", label: "Info", icon: Info },
  { id: "organize", label: "Organize", icon: Palette },
  { id: "versions", label: "Versions", icon: History },
  { id: "activity", label: "Activity", icon: Activity },
];

export default function FilePreviewModal({
  file: initialFile,
  files = [],
  onClose,
  onDelete,
  onStar,
  onRefresh,
  organizerMeta = {},
  onOrganizerUpdate,
  isOwner = true,
}) {
  const [file, setFile] = useState(initialFile);
  const [tab, setTab] = useState("preview");
  const [signedUrl, setSignedUrl] = useState(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [starring, setStarring] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setFile(initialFile);
  }, [initialFile]);

  const currentIndex = files.findIndex((item) => item._id === file._id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < files.length - 1;

  // ── FIX: Convert relative signed URL to absolute using api.defaults.baseURL ──
  useEffect(() => {
    if (!file?._id) return;
    setPreviewError(false);
    setRetryCount(0);
    let mounted = true;
    setUrlLoading(true);
    setSignedUrl(null);

    api.get(`/api/files/${file._id}/signed-url`)
      .then(({ data }) => {
        if (mounted) {
          let url = data.url || data.signedUrl;
          // If the URL is relative, prepend the API base URL
          if (url && !url.startsWith('http')) {
            url = new URL(url, api.defaults.baseURL).href;
          }
          setSignedUrl(url);
        }
      })
      .catch(() => {
        if (mounted) setPreviewError(true);
      })
      .finally(() => {
        if (mounted) setUrlLoading(false);
      });

    return () => { mounted = false; };
  }, [file?._id, retryCount]);

  useEffect(() => {
    const handler = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrev) setFile(files[currentIndex - 1]);
      if (event.key === "ArrowRight" && hasNext) setFile(files[currentIndex + 1]);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, files, hasNext, hasPrev, onClose]);

  // ✅ UPDATED handleDownload using signed URL with inline=0
  const handleDownload = useCallback(async () => {
    try {
      toast.loading("Preparing download...", { id: "download-file" });
      const { data } = await api.get(`/api/files/${file._id}/signed-url?inline=0`);
      const response = await fetch(data.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.dismiss("download-file");
      toast.success("Download started!");
    } catch (err) {
      console.error("Download error:", err);
      toast.dismiss("download-file");
      toast.error("Download failed.");
    }
  }, [file._id, file.originalName]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/files/${file._id}`);
      toast.success("File deleted.");
      onDelete?.(file._id);
      onClose();
    } catch {
      toast.error("Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  const handleStar = async () => {
    setStarring(true);
    try {
      const nextStarred = !file.isStarred;
      if (nextStarred) await api.post(`/api/files/${file._id}/star`);
      else await api.delete(`/api/files/${file._id}/star`);
      setFile((prev) => ({ ...prev, isStarred: nextStarred }));
      onStar?.(file._id, nextStarred);
      toast.success(nextStarred ? "Starred!" : "Unstarred.");
    } catch {
      toast.error("Failed to update star.");
    } finally {
      setStarring(false);
    }
  };

  const retryPreview = () => setRetryCount(prev => prev + 1);

  const preview = useMemo(() => {
    if (urlLoading) {
      return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-brand-glow" /></div>;
    }

    if (previewError) {
      return (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-red-900/20 border border-red-900/30 flex items-center justify-center">
            <AlertCircle size={24} className="text-accent-red" />
          </div>
          <p className="text-gray-400">Failed to load preview.</p>
          <button onClick={retryPreview} className="btn-ghost text-sm px-4 py-2">Retry</button>
          <button onClick={handleDownload} className="btn-primary px-4 py-2">
            <Download size={14} /> Download
          </button>
        </div>
      );
    }

    if (!signedUrl) {
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

    // Image viewer with error handling
    if (file.mimetype?.startsWith("image/")) {
      return <ImageViewer src={signedUrl} alt={file.originalName} />;
    }

    // Video with error handling
    if (file.mimetype?.startsWith("video/")) {
      return (
        <video
          controls
          className="w-full max-h-[480px] rounded-xl border border-surface-4 bg-black"
          src={signedUrl}
          preload="metadata"
          onError={() => setPreviewError(true)}
        />
      );
    }

    // Audio (already has error handling via source)
    if (file.mimetype?.startsWith("audio/")) {
      return <AudioPlayer src={signedUrl} file={file} onError={() => setPreviewError(true)} />;
    }

    // PDF with error handling
    if (file.mimetype === "application/pdf") {
      return <PdfViewer src={signedUrl} onError={() => setPreviewError(true)} />;
    }

    if (isEpubFile(file)) return <EbookPreview file={file} downloadUrl={signedUrl} />;
    if (OFFICE_MIMES[file.mimetype]) return <OfficePreview file={file} downloadUrl={signedUrl} />;
    if (isTextFile(file)) return <TextFetcher file={file} downloadUrl={signedUrl} />;

    return <BrowserFallbackViewer src={signedUrl} file={file} />;
  }, [file, handleDownload, signedUrl, urlLoading, previewError]);

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" 
        onClick={onClose}
      >
        <div 
          className="bg-surface-1 border border-surface-4 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-up" 
          onClick={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-3 flex-shrink-0">
            <span className="text-2xl flex-shrink-0">{getFileIcon(file.mimetype)}</span>

            {renaming ? (
              <InlineRename
                file={file}
                onDone={(newName) => {
                  if (newName) {
                    setFile((prev) => ({ ...prev, originalName: newName }));
                    onRefresh?.();
                  }
                  setRenaming(false);
                }}
              />
            ) : (
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-bold text-white text-base truncate" title={file.originalName}>
                  {file.originalName}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-500 font-mono">{formatBytes(file.size)}</span>
                  <LabelDot labels={file.labels} />
                  {file.isStarred && <Star size={11} className="text-yellow-400 fill-yellow-400" />}
                  {organizerMeta?.aliases?.length > 0 && (
                    <span className="text-[10px] text-brand-glow font-mono">@{organizerMeta.aliases[0]}</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isOwner && <LabelPicker file={file} onUpdate={(updated) => setFile(updated)} />}

              <button 
                onClick={handleStar} 
                disabled={starring} 
                className="p-2 rounded-lg text-gray-500 hover:text-yellow-400 hover:bg-yellow-900/10 transition-all"
              >
                <Star size={15} className={file.isStarred ? "fill-yellow-400 text-yellow-400" : ""} />
              </button>

              {isOwner && (
                <button 
                  onClick={() => setRenaming((prev) => !prev)} 
                  className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-surface-3 transition-all"
                >
                  <Edit3 size={15} />
                </button>
              )}

              <button 
                onClick={() => setShowShare(true)} 
                className="p-2 rounded-lg text-gray-500 hover:text-brand-glow hover:bg-brand/10 transition-all"
              >
                <Share2 size={15} />
              </button>
              
              <button 
                onClick={handleDownload} 
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-surface-3 transition-all"
              >
                <Download size={15} />
              </button>
              
              {isOwner && (
                <button 
                  onClick={handleDelete} 
                  disabled={deleting} 
                  className="p-2 rounded-lg text-gray-500 hover:text-accent-red hover:bg-red-900/10 transition-all"
                >
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                </button>
              )}

              {files.length > 1 && (
                <>
                  <div className="w-px h-5 bg-surface-4 mx-1" />
                  <button 
                    onClick={() => setFile(files[currentIndex - 1])} 
                    disabled={!hasPrev} 
                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-surface-3 transition-all disabled:opacity-30"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <span className="text-xs text-gray-600 font-mono">{currentIndex + 1}/{files.length}</span>
                  <button 
                    onClick={() => setFile(files[currentIndex + 1])} 
                    disabled={!hasNext} 
                    className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-surface-3 transition-all disabled:opacity-30"
                  >
                    <ChevronRight size={15} />
                  </button>
                </>
              )}

              <button 
                onClick={onClose} 
                className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-surface-3 transition-all ml-1"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 px-5 pt-3 border-b border-surface-3 flex-shrink-0 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap -mb-px ${
                  tab === id ? "border-brand text-brand-glow" : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5">
            {tab === "preview" && <div className="animate-fade-up">{preview}</div>}
            {tab === "info" && <InfoTab file={file} organizerMeta={organizerMeta} />}
            {tab === "organize" && (
              <OrganizerTab
                file={file}
                files={files}
                organizerMeta={organizerMeta}
                onOrganizerUpdate={onOrganizerUpdate}
                onRefresh={onRefresh}
              />
            )}
            {tab === "versions" && (
              <FileVersionHistory
                fileId={file._id}
                onRestore={() => {
                  onRefresh?.();
                  onClose();
                }}
              />
            )}
            {tab === "activity" && <FileActivityLog fileId={file._id} isOwner={isOwner} />}
          </div>
        </div>
      </div>

      {showShare && <AdvancedShareModal file={file} onClose={() => setShowShare(false)} />}
    </>
  );
}