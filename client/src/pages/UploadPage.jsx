import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  UploadCloud, X, CheckCircle2, AlertCircle, FileWarning,
  Loader2, Zap, Info, Link2, ExternalLink, Download,
  Tag, FileText,
} from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatBytes, getFileIcon } from "../utils/helpers";
import toast from "react-hot-toast";

const MAX_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg","image/png","image/gif","image/webp","image/svg+xml",
  "application/pdf","application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain","text/csv","application/zip","video/mp4","video/webm",
  "audio/mpeg","audio/wav",
];

const FileRow = ({ file, onRemove }) => {
  const icons = {
    pending:   <div className="w-4 h-4 rounded-full border-2 border-gray-600" />,
    uploading: <Loader2 size={16} className="animate-spin text-brand-glow" />,
    success:   <CheckCircle2 size={16} className="text-accent-green" />,
    error:     <AlertCircle size={16} className="text-accent-red" />,
    duplicate: <FileWarning size={16} className="text-accent-amber" />,
  };
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
      file.status === "success"   ? "bg-green-900/10 border-green-900/30"  :
      file.status === "error"     ? "bg-red-900/10   border-red-900/30"    :
      file.status === "duplicate" ? "bg-amber-900/10 border-amber-900/30"  :
      "bg-surface-2 border-surface-4"
    }`}>
      <span className="text-xl flex-shrink-0">{getFileIcon(file.type)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate font-medium">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-gray-500 font-mono">{formatBytes(file.size)}</span>
          {file.status === "uploading" && (
            <div className="flex-1 h-1 bg-surface-4 rounded-full overflow-hidden">
              <div className="h-full progress-bar rounded-full" style={{ width: `${file.progress || 10}%` }} />
            </div>
          )}
          {file.message && (
            <span className={`text-[11px] ${
              file.status === "success" ? "text-accent-green" :
              file.status === "duplicate" ? "text-accent-amber" : "text-accent-red"
            }`}>{file.message}</span>
          )}
        </div>
      </div>
      {icons[file.status]}
      {(file.status === "pending" || file.status === "error") && (
        <button onClick={() => onRemove(file.id)} className="text-gray-600 hover:text-accent-red transition-colors ml-1">
          <X size={14} />
        </button>
      )}
    </div>
  );
};

const UrlUploadTab = ({ onUploadComplete }) => {
  const [url,      setUrl]      = useState("");
  const [filename, setFilename] = useState("");
  const [tags,     setTags]     = useState("");
  const [desc,     setDesc]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);

  const handleImport = async () => {
    if (!url.trim()) return toast.error("Please enter a URL.");
    try { new URL(url); } catch { return toast.error("Please enter a valid URL (include https://)."); }
    setLoading(true); setResult(null);
    try {
      const { data } = await api.post("/api/files/upload-from-url", {
        url: url.trim(), filename: filename.trim() || undefined,
        tags: tags.trim() || undefined, description: desc.trim() || undefined,
      });
      setResult({ success: true, file: data.file, message: data.message });
      toast.success(data.message || "File imported!");
      setUrl(""); setFilename(""); setTags(""); setDesc("");
      onUploadComplete?.();
    } catch (err) {
      const msg = err.response?.data?.message || "Import failed.";
      setResult({ success: false, message: msg });
      toast.error(msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
          <Link2 size={11} /> File URL *
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://example.com/file.pdf"
            className="input flex-1 font-mono text-sm"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleImport()}
          />
          <a href={url || "#"} target="_blank" rel="noopener noreferrer"
            className="w-10 h-10 rounded-lg flex items-center justify-center bg-surface-3 border border-surface-4 text-gray-500 hover:text-white transition-colors flex-shrink-0">
            <ExternalLink size={14} />
          </a>
        </div>
        <p className="text-[11px] text-gray-600 mt-1">Supports images, PDFs, videos, audio, archives. Max 50 MB.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
            <FileText size={11} /> Filename Override
          </label>
          <input type="text" placeholder="my-document.pdf" className="input" value={filename} onChange={(e) => setFilename(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
            <Tag size={11} /> Tags <span className="text-gray-600">(comma separated)</span>
          </label>
          <input type="text" placeholder="design, reference" className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1.5">Description</label>
        <input type="text" placeholder="Optional description…" className="input" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <button onClick={handleImport} disabled={loading || !url.trim()} className="btn-primary w-full justify-center py-3 text-sm">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Importing…</> : <><Download size={16} /> Import from URL</>}
      </button>
      {result && (
        <div className={`p-4 rounded-xl border animate-fade-up ${result.success ? "bg-emerald-900/10 border-emerald-900/30" : "bg-red-900/10 border-red-900/30"}`}>
          <div className="flex items-start gap-2">
            {result.success
              ? <CheckCircle2 size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              : <AlertCircle  size={15} className="text-accent-red mt-0.5 flex-shrink-0" />}
            <div className="min-w-0">
              <p className={`text-sm font-medium ${result.success ? "text-emerald-300" : "text-accent-red"}`}>{result.message}</p>
              {result.success && result.file && (
                <p className="text-[11px] text-gray-500 mt-0.5 font-mono truncate">
                  {result.file.originalName} · {formatBytes(result.file.size)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="card p-3 flex items-start gap-2">
        <Info size={13} className="text-gray-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-gray-600 leading-relaxed">
          VaultFS fetches the file server-side. The source URL must be publicly accessible.
          Duplicate detection applies — existing files won't be re-imported.
        </p>
      </div>
    </div>
  );
};

export default function UploadPage() {
  const { refreshUser } = useAuth();
  const [activeTab,    setActiveTab]    = useState("files");
  const [files,        setFiles]        = useState([]);
  const [uploading,    setUploading]    = useState(false);
  const [tags,         setTags]         = useState("");
  const [description,  setDescription]  = useState("");
  const [rateLimitHit, setRateLimitHit] = useState(false);

  const onDrop = useCallback((accepted, rejected) => {
    const newFiles = accepted.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f, name: f.name, size: f.size, type: f.type,
      status: "pending", progress: 0, message: "",
    }));
    if (rejected.length) toast.error(`${rejected.length} file(s) rejected: ${rejected[0].errors[0]?.message}`);
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_SIZE,
    accept: Object.fromEntries(ALLOWED_TYPES.map((t) => [t, []])),
    multiple: true,
  });

  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));
  const clearAll   = ()   => setFiles([]);

  const handleUpload = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (!pending.length) { toast.error("No files to upload."); return; }
    setUploading(true); setRateLimitHit(false);

    const batchSize = 5;
    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize);
      const formData = new FormData();
      batch.forEach((f) => formData.append("files", f.file));
      if (tags)        formData.append("tags", tags);
      if (description) formData.append("description", description);

      setFiles((prev) => prev.map((f) =>
        batch.find((b) => b.id === f.id) ? { ...f, status: "uploading", progress: 20 } : f
      ));

      try {
        const { data } = await api.post("/api/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            const pct = Math.round((e.loaded / e.total) * 100);
            setFiles((prev) => prev.map((f) =>
              batch.find((b) => b.id === f.id) ? { ...f, progress: pct } : f
            ));
          },
        });
        const uploadedNames = new Set(data.files.map((f) => f.originalName));
        const skippedNames  = new Set(data.skipped?.map((s) => s.originalName) || []);
        setFiles((prev) => prev.map((f) => {
          if (!batch.find((b) => b.id === f.id)) return f;
          if (uploadedNames.has(f.name)) return { ...f, status: "success",    progress: 100, message: "Uploaded"  };
          if (skippedNames.has(f.name))  return { ...f, status: "duplicate",  message: "Duplicate" };
          return { ...f, status: "error", message: "Failed" };
        }));
        if (data.files.length)    toast.success(`${data.files.length} file(s) uploaded!`);
        if (data.skipped?.length) toast(`${data.skipped.length} duplicate(s) skipped.`, { icon: "⚠️" });
      } catch (err) {
        if (err.response?.status === 429) {
          setRateLimitHit(true);
          setFiles((prev) => prev.map((f) =>
            batch.find((b) => b.id === f.id) ? { ...f, status: "error", message: "Rate limited" } : f
          ));
          break;
        }
        const msg = err.response?.data?.message || "Upload failed";
        setFiles((prev) => prev.map((f) =>
          batch.find((b) => b.id === f.id) ? { ...f, status: "error", message: msg } : f
        ));
      }
    }
    setUploading(false); refreshUser();
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const TABS = [
    { id: "files", label: "Upload Files",    icon: UploadCloud },
    { id: "url",   label: "Import from URL", icon: Link2 },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Upload</h1>
        <p className="text-gray-500 text-sm mt-1">Drop files directly or import from any public URL</p>
      </div>

      {rateLimitHit && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-red-900/20 border border-red-900/40 text-accent-red text-sm animate-fade-up">
          <AlertCircle size={16} className="flex-shrink-0" />
          Upload rate limit reached. Please wait a moment before uploading more files.
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 bg-surface-2 border border-surface-4 rounded-xl p-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? "bg-surface-1 text-white shadow-sm border border-surface-4"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {activeTab === "files" && (
        <div className="space-y-5 animate-fade-up">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragActive
                ? "dropzone-active border-brand bg-brand/5"
                : "border-surface-4 hover:border-brand/40 bg-surface-2 hover:bg-surface-3"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${isDragActive ? "bg-brand/20 shadow-glow" : "bg-surface-3"}`}>
                <UploadCloud size={26} className={isDragActive ? "text-brand-glow" : "text-gray-500"} />
              </div>
              <div>
                <p className="text-white font-medium">{isDragActive ? "Drop files here…" : "Drag & drop files here"}</p>
                <p className="text-gray-500 text-sm mt-1">or <span className="text-brand-glow cursor-pointer">browse to choose</span></p>
              </div>
              <div className="flex flex-wrap justify-center gap-1 mt-1">
                {["JPG","PNG","PDF","MP4","ZIP","DOCX","CSV"].map((ext) => (
                  <span key={ext} className="badge bg-surface-4 text-gray-500 text-[10px]">{ext}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Tag size={11} /> Tags <span className="text-gray-600">(comma separated)</span>
              </label>
              <input type="text" className="input" placeholder="project, invoice, 2024" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                <FileText size={11} /> Description
              </label>
              <input type="text" className="input" placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          {files.length > 0 && (
            <div className="card p-4 space-y-2 animate-fade-up">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white">
                  {files.length} file(s) {successCount > 0 && `· ${successCount} uploaded`}
                </p>
                <button onClick={clearAll} disabled={uploading} className="text-xs text-gray-500 hover:text-accent-red transition-colors">
                  Clear all
                </button>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {files.map((f) => <FileRow key={f.id} file={f} onRemove={removeFile} />)}
              </div>
            </div>
          )}

          {pendingCount > 0 && (
            <button onClick={handleUpload} disabled={uploading} className="btn-primary w-full justify-center text-base py-3 animate-fade-up">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
              {uploading ? "Uploading…" : `Upload ${pendingCount} file${pendingCount > 1 ? "s" : ""}`}
            </button>
          )}

          <div className="card p-3 flex items-start gap-2">
            <Info size={13} className="text-gray-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600 leading-relaxed">
              Authenticated users can upload <strong className="text-gray-500">10 files/minute</strong> with
              up to <strong className="text-gray-500">500 MB/hour</strong> bandwidth.
              Duplicate files are automatically detected and skipped.
            </p>
          </div>
        </div>
      )}

      {activeTab === "url" && (
        <div className="animate-fade-up">
          <UrlUploadTab onUploadComplete={refreshUser} />
        </div>
      )}
    </div>
  );
}
