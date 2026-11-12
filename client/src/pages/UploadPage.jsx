import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import {
  AlertCircle, CheckCircle2, Download, ExternalLink, FileText, Info, Link2, Loader2,
  Tag, UploadCloud, X, Zap, Shield, Clipboard, FolderUp, RefreshCw, Play, CheckSquare, Trash2
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { formatBytes, getFileIcon } from "../utils/helpers";
import EncryptionModal from "../components/EncryptionModal";
import { encryptFileWithPassword } from "../utils/encryption";

const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain", "text/csv", "application/zip",
  "video/mp4", "video/webm",
  "audio/mpeg", "audio/wav",
];

// ── File Row Component ────────────────────────────────────────────────────────
function FileRow({ file, onRemove, onRetry }) {
  const [preview, setPreview] = useState(null);

  // Create image preview URL
  useEffect(() => {
    if (file.type?.startsWith("image/") && file.file) {
      const url = URL.createObjectURL(file.file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file.file, file.type]);

  const statusIcons = {
    pending: <div className="w-4 h-4 rounded-full border-2 border-gray-500" />,
    uploading: <Loader2 size={16} className="animate-spin text-brand-glow" />,
    success: <CheckCircle2 size={16} className="text-accent-green" />,
    error: <AlertCircle size={16} className="text-accent-red" />,
    duplicate: <AlertCircle size={16} className="text-accent-amber" />,
  };

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${
      file.status === "success" ? "bg-green-900/10 border-green-900/30"
      : file.status === "error" ? "bg-red-900/10 border-red-900/30"
      : file.status === "duplicate" ? "bg-amber-900/10 border-amber-900/30"
      : "bg-surface-2 border-surface-4"
    }`}>
      <div className="w-10 h-10 rounded-md overflow-hidden bg-surface-3 flex-shrink-0 flex items-center justify-center border border-surface-4">
        {preview ? (
          <img src={preview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl">{getFileIcon(file.type)}</span>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate font-medium">{file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-gray-500 font-mono">{formatBytes(file.size)}</span>
          {file.status === "uploading" && (
            <div className="flex-1 h-1.5 bg-surface-4 rounded-full overflow-hidden max-w-[200px]">
              <div className="h-full progress-bar rounded-full transition-all duration-300" style={{ width: `${file.progress || 0}%` }} />
            </div>
          )}
          {file.message && (
            <span className={`text-[11px] truncate ${
              file.status === "success" ? "text-accent-green"
              : file.status === "duplicate" ? "text-accent-amber" : "text-accent-red"
            }`}>
              {file.message}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 flex-shrink-0">
        {statusIcons[file.status]}
        {file.status === "error" && (
          <button onClick={() => onRetry(file)} className="p-1.5 text-amber-400 hover:bg-amber-900/20 rounded-md transition-colors" title="Retry">
            <RefreshCw size={14} />
          </button>
        )}
        {(file.status === "pending" || file.status === "error" || file.status === "duplicate") && (
          <button onClick={() => onRemove(file.id)} className="p-1.5 text-gray-500 hover:text-accent-red hover:bg-red-900/20 rounded-md transition-colors" title="Remove">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── URL Upload Tab ────────────────────────────────────────────────────────────
function UrlUploadTab({ onUploadComplete }) {
  const [url, setUrl] = useState("");
  const [filename, setFilename] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!url.trim()) return toast.error("Please enter a URL.");
    try { new URL(url); } catch { return toast.error("Invalid URL format."); }
    setLoading(true);
    try {
      await api.post("/api/files/upload-from-url", { url, filename, tags });
      toast.success("File imported successfully!");
      setUrl(""); setFilename(""); setTags("");
      onUploadComplete?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Import failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
          <Link2 size={11} /> File URL *
        </label>
        <div className="flex gap-2">
          <input type="url" placeholder="https://example.com/file.pdf" className="input flex-1 font-mono text-sm" value={url} onChange={(e) => setUrl(e.target.value)} />
          <a href={url || "#"} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-lg flex items-center justify-center bg-surface-3 border border-surface-4 text-gray-500 hover:text-white transition-colors flex-shrink-0">
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5"><FileText size={11} /> Filename Override</label>
          <input type="text" placeholder="my-document.pdf" className="input" value={filename} onChange={(e) => setFilename(e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5"><Tag size={11} /> Tags</label>
          <input type="text" placeholder="design, reference" className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
      </div>
      <button onClick={handleImport} disabled={loading || !url.trim()} className="btn-primary w-full justify-center py-3 text-sm">
        {loading ? <><Loader2 size={16} className="animate-spin" /> Importing...</> : <><Download size={16} /> Import from URL</>}
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function UploadPage() {
  const { refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("files");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [showEncryptionModal, setShowEncryptionModal] = useState(false);

  const folderInputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // ── Add files helper ────────────────────────────────────────────────────────
  const addFiles = useCallback((newFiles, folderName = "") => {
    const validFiles = newFiles.filter(file => {
      if (file.size > MAX_SIZE) { toast.error(`"${file.name}" is too large (max 500MB).`); return false; }
      if (!ALLOWED_TYPES.includes(file.type) && file.type !== "") { toast.error(`"${file.name}" type not allowed.`); return false; }
      return true;
    });

    const queued = validFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      name: file.webkitRelativePath || file.name,
      size: file.size,
      type: file.type,
      status: "pending",
      progress: 0,
      message: folderName ? `From: ${folderName}` : "",
    }));

    setFiles((prev) => [...prev, ...queued]);
  }, []);

  // ── Dropzone ────────────────────────────────────────────────────────────────
  const onDrop = useCallback((accepted, rejected) => {
    addFiles(accepted);
    if (rejected.length) toast.error(`${rejected.length} file(s) rejected.`);
  }, [addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_SIZE,
    accept: Object.fromEntries(ALLOWED_TYPES.map((type) => [type, []])),
    multiple: true,
  });

  // ── Paste Support ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handlePaste = (e) => {
      if (activeTab !== "files") return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const pastedFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file") {
          const file = items[i].getAsFile();
          if (file) pastedFiles.push(file);
        }
      }
      if (pastedFiles.length > 0) {
        addFiles(pastedFiles);
        toast.success(`${pastedFiles.length} file(s) pasted from clipboard!`);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addFiles, activeTab]);

  // ── Folder Input ────────────────────────────────────────────────────────────
  const handleFolderSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length) {
      const folderName = selectedFiles[0].webkitRelativePath.split('/')[0];
      addFiles(selectedFiles, folderName);
      toast.success(`Added ${selectedFiles.length} files from folder "${folderName}"`);
    }
    e.target.value = null; // reset
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));
  const clearAll = () => { if (!uploading) setFiles([]); };
  
  const retryFile = (fileToRetry) => {
    setFiles((prev) => prev.map(f => f.id === fileToRetry.id ? { ...f, status: "pending", message: "" } : f));
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setUploading(false);
      setFiles(prev => prev.map(f => f.status === "uploading" ? { ...f, status: "error", message: "Cancelled" } : f));
      toast.error("Upload cancelled.");
    }
  };

  // ── Upload Logic ────────────────────────────────────────────────────────────
  const handleUpload = async (isEncrypted = false, password = "") => {
    const pending = files.filter((f) => f.status === "pending");
    if (!pending.length) return toast.error("No pending files to upload.");

    setUploading(true);
    setOverallProgress(0);
    abortControllerRef.current = new AbortController();

    const batchSize = 5;
    let completedCount = 0;

    for (let index = 0; index < pending.length; index += batchSize) {
      if (abortControllerRef.current?.signal.aborted) break;

      const batch = pending.slice(index, index + batchSize);
      
      // Mark batch as uploading
      setFiles((prev) => prev.map((file) => batch.find((b) => b.id === file.id) ? { ...file, status: "uploading", progress: 20 } : file));

      try {
        let formData = new FormData();
        
        if (isEncrypted) {
          // Encrypted upload logic (simplified for batch)
          for (const item of batch) {
            const encryptedBlob = await encryptFileWithPassword(item.file, password);
            formData.append("files", encryptedBlob, `${item.file.name}.encrypted`);
            formData.append("originalNames", item.file.name);
          }
          formData.append("isEncrypted", "true");
        } else {
          batch.forEach((item) => formData.append("files", item.file));
        }

        if (tags) formData.append("tags", tags);
        if (description) formData.append("description", description);

        const endpoint = isEncrypted ? "/api/files/upload-encrypted" : "/api/files/upload";
        const { data } = await api.post(endpoint, formData, {
          headers: { "Content-Type": "multipart/form-data" },
          signal: abortControllerRef.current.signal,
          onUploadProgress: (event) => {
            if (event.total) {
              const batchPercent = Math.round((event.loaded / event.total) * 100);
              setFiles((prev) => prev.map((file) => batch.find((b) => b.id === file.id) ? { ...file, progress: batchPercent } : file));
            }
          },
        });

        // Handle success
        const uploadedNames = new Set(data.files?.map((f) => f.originalName) || []);
        const skippedNames = new Set(data.skipped?.map((item) => item.originalName) || []);

        setFiles((prev) => prev.map((file) => {
          if (!batch.find((b) => b.id === file.id)) return file;
          if (uploadedNames.has(file.file.name)) return { ...file, status: "success", progress: 100, message: "Uploaded" };
          if (skippedNames.has(file.file.name)) return { ...file, status: "duplicate", progress: 100, message: "Duplicate" };
          return { ...file, status: "error", progress: 0, message: "Failed" };
        }));

        completedCount += batch.length;
        setOverallProgress(Math.round((completedCount / pending.length) * 100));

      } catch (error) {
        if (error.name === "CanceledError" || error.name === "AbortError") break;

        const message = error.response?.data?.message || "Upload failed";
        setFiles((prev) => prev.map((file) => batch.find((b) => b.id === file.id) ? { ...file, status: "error", progress: 0, message } : file));
      }
    }

    setUploading(false);
    abortControllerRef.current = null;
    refreshUser();

    // Summary toast
    const successCount = files.filter(f => f.status === "success").length;
    if (successCount > 0) toast.success(`Upload process finished!`);
  };

  const handleEncryptedUpload = async (password) => {
    setShowEncryptionModal(false);
    await handleUpload(true, password);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const pending = files.filter(f => f.status === "pending").length;
    const success = files.filter(f => f.status === "success").length;
    const errors = files.filter(f => f.status === "error").length;
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    return { pending, success, errors, totalSize };
  }, [files]);

  const tabs = [
    { id: "files", label: "Upload Files", icon: UploadCloud },
    { id: "url", label: "Import from URL", icon: Link2 },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5 pb-24">
      <div>
        <h1 className="font-display font-bold text-2xl text-white">Upload Center</h1>
        <p className="text-gray-500 text-sm mt-1">Drop files, paste from clipboard, or upload entire folders.</p>
      </div>

      <div className="flex gap-1 bg-surface-2 border border-surface-4 rounded-xl p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === id ? "bg-surface-1 text-white shadow-sm border border-surface-4" : "text-gray-500 hover:text-gray-300"
            }`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {activeTab === "files" && (
        <div className="space-y-5 animate-fade-up">
          
          {/* Dropzone Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
              isDragActive ? "border-brand bg-brand/5 dropzone-active" : "border-surface-4 hover:border-brand/40 bg-surface-2 hover:bg-surface-3"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${isDragActive ? "bg-brand/20 shadow-glow" : "bg-surface-3"}`}>
                <UploadCloud size={26} className={isDragActive ? "text-brand-glow" : "text-gray-500"} />
              </div>
              <div>
                <p className="text-white font-medium">{isDragActive ? "Drop files here..." : "Drag and drop files here"}</p>
                <p className="text-gray-500 text-sm mt-1">or <span className="text-brand-glow cursor-pointer hover:underline">browse to choose</span></p>
              </div>
              
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-surface-1 px-3 py-1.5 rounded-lg border border-surface-4">
                  <Clipboard size={13} /> Paste anywhere to upload
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                  className="btn-ghost text-xs px-3 py-1.5 border border-surface-4 bg-surface-1"
                >
                  <FolderUp size={13} /> Upload Folder
                </button>
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFolderSelect}
                  webkitdirectory=""
                  directory=""
                />
              </div>
            </div>
          </div>

          {/* Tags & Description */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Tag size={11} /> Default Tags
              </label>
              <input type="text" className="input" placeholder="project, invoice, 2024" value={tags} onChange={(e) => setTags(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                <FileText size={11} /> Description
              </label>
              <input type="text" className="input" placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          {/* Upload Queue */}
          {files.length > 0 && (
            <div className="card p-4 space-y-3 animate-fade-up">
              <div className="flex items-center justify-between border-b border-surface-3 pb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-white">Upload Queue</h3>
                  <span className="text-xs text-gray-500">{files.length} files ({formatBytes(stats.totalSize)})</span>
                </div>
                {!uploading && (
                  <button onClick={clearAll} className="text-xs text-gray-500 hover:text-accent-red transition-colors flex items-center gap-1">
                    <Trash2 size={12} /> Clear all
                  </button>
                )}
              </div>
              
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                {files.map((file) => <FileRow key={file.id} file={file} onRemove={removeFile} onRetry={retryFile} />)}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="card p-3 flex items-start gap-2 bg-surface-2">
            <Info size={13} className="text-gray-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500 leading-relaxed">
              Max size is <strong className="text-gray-400">500 MB</strong> per file. Duplicates are automatically skipped. 
              Folder upload will append the folder name as a tag.
            </p>
          </div>

        </div>
      )}

      {activeTab === "url" && (
        <div className="animate-fade-up">
          <UrlUploadTab onUploadComplete={refreshUser} />
        </div>
      )}

      {/* ── Floating Upload Bar ── */}
      {activeTab === "files" && (stats.pending > 0 || uploading) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg z-40 animate-fade-up px-4">
          <div className="bg-surface-1 border border-surface-4 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 backdrop-blur-md">
            
            {/* Global Progress */}
            {uploading && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-brand-glow">Uploading {stats.pending} file(s)...</span>
                  <span className="text-white">{overallProgress}%</span>
                </div>
                <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full transition-all duration-300" style={{ width: `${overallProgress}%` }} />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                {uploading ? `Processing...` : `${stats.pending} files ready`}
              </span>
              <div className="flex items-center gap-2">
                {uploading ? (
                  <button onClick={cancelUpload} className="btn-danger text-sm px-4">
                    <X size={14} /> Cancel
                  </button>
                ) : (
                  <>
                    <button onClick={() => setShowEncryptionModal(true)} className="btn-ghost text-sm px-3 border border-surface-4">
                      <Shield size={14} /> Encrypt
                    </button>
                    <button onClick={() => handleUpload(false)} className="btn-primary text-sm px-5">
                      <Play size={14} /> Start Upload
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {showEncryptionModal && (
        <EncryptionModal onConfirm={handleEncryptedUpload} onClose={() => setShowEncryptionModal(false)} />
      )}
    </div>
  );
}
