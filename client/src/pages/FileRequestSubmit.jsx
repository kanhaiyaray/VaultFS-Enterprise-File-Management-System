import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import {
  UploadCloud, CheckCircle2, AlertCircle, Loader2,
  Zap, FileWarning, X, Mail, User, MessageSquare,
} from "lucide-react";
import api from "../utils/api";
import { formatBytes, getFileIcon } from "../utils/helpers";
import toast from "react-hot-toast";

const MAX_SIZE = 50 * 1024 * 1024;

export default function FileRequestSubmit() {
  const { slug } = useParams();

  const [request,    setRequest]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [expired,    setExpired]    = useState(false);

  const [files,      setFiles]      = useState([]);
  const [uploaderName,  setUploaderName]  = useState("");
  const [uploaderEmail, setUploaderEmail] = useState("");
  const [message,    setMessage]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/api/file-requests/${slug}`);
        const requestData = data.fileRequest || data.request;
        if (!requestData) {
          setNotFound(true);
          return;
        }
        if (requestData.expiresAt && new Date(requestData.expiresAt) < new Date()) {
          setExpired(true);
        }
        setRequest(requestData);
      } catch (err) {
        if (err.response?.status === 404) setNotFound(true);
        else toast.error("Failed to load file request.");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const onDrop = useCallback((accepted, rejected) => {
    const maxPerReq = request?.maxFiles || 10;
    if (files.length + accepted.length > maxPerReq) {
      toast.error(`Max ${maxPerReq} file(s) allowed per request.`);
      accepted = accepted.slice(0, maxPerReq - files.length);
    }
    if (rejected.length) toast.error(`${rejected.length} file(s) rejected — too large or unsupported type.`);
    const newFiles = accepted.map((f) => ({
      id: `${f.name}-${Date.now()}-${Math.random()}`,
      file: f, name: f.name, size: f.size, type: f.type,
      status: "pending",
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, [files, request]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: request?.maxFileSizeBytes || MAX_SIZE,
    accept: request?.allowedTypes?.length
      ? Object.fromEntries(request.allowedTypes.map((type) => [type, []]))
      : undefined,
    multiple: true,
  });

  const removeFile = (id) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length) { toast.error("Please add at least one file."); return; }
    if (request?.requireEmail && !uploaderEmail.trim()) {
      toast.error("Email is required for this request."); return;
    }

    setSubmitting(true);
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f.file));
    if (uploaderName.trim())  formData.append("uploaderName",  uploaderName.trim());
    if (uploaderEmail.trim()) formData.append("uploaderEmail", uploaderEmail.trim());
    if (message.trim())       formData.append("message",       message.trim());

    try {
      await api.post(`/api/file-requests/${slug}/submit`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── States ─────────────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 grid-bg flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-glow" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-surface-0 grid-bg flex items-center justify-center p-4">
        <div className="card p-10 max-w-md w-full text-center">
          <AlertCircle size={32} className="text-accent-red mx-auto mb-4" />
          <h2 className="font-display font-bold text-xl text-white mb-2">Request Not Found</h2>
          <p className="text-gray-500 text-sm">This file request link is invalid or has been removed.</p>
        </div>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-surface-0 grid-bg flex items-center justify-center p-4">
        <div className="card p-10 max-w-md w-full text-center">
          <AlertCircle size={32} className="text-accent-amber mx-auto mb-4" />
          <h2 className="font-display font-bold text-xl text-white mb-2">Request Expired</h2>
          <p className="text-gray-500 text-sm">This file request has expired. Please contact the requester for a new link.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-surface-0 grid-bg flex items-center justify-center p-4">
        <div className="card p-10 max-w-md w-full text-center animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-green-900/30 border border-green-900/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-accent-green" />
          </div>
          <h2 className="font-display font-bold text-xl text-white mb-2">Files Submitted!</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your {files.length} file{files.length !== 1 ? "s have" : " has"} been delivered to{" "}
            <strong className="text-white">{request?.ownerName || "the requester"}</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Branding */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand/20 border border-brand/30 flex items-center justify-center shadow-glow mx-auto mb-3">
            <Zap size={18} className="text-brand-glow" />
          </div>
          <p className="text-xs text-gray-600">Powered by VaultFS</p>
        </div>

        <div className="card p-6 shadow-2xl space-y-5">
          {/* Request info */}
          <div>
            <h1 className="font-display font-bold text-xl text-white">{request?.title || "File Request"}</h1>
            {request?.description && (
              <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">{request.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {request?.maxFiles && (
                <span className="badge bg-surface-3 text-gray-400 text-[10px]">Max {request.maxFiles} file{request.maxFiles !== 1 ? "s" : ""}</span>
              )}
              {request?.maxFileSizeBytes && (
                <span className="badge bg-surface-3 text-gray-400 text-[10px]">Max {formatBytes(request.maxFileSizeBytes)} per file</span>
              )}
              {request?.expiresAt && (
                <span className="badge bg-amber-900/15 text-accent-amber text-[10px] border border-amber-900/20">
                  Expires {new Date(request.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Uploader info */}
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <User size={11} /> Your Name
                </label>
                <input
                  type="text" placeholder="Jane Smith"
                  className="input"
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Mail size={11} /> Your Email {request?.requireEmail && <span className="text-accent-red">*</span>}
                </label>
                <input
                  type="email"
                  required={request?.requireEmail}
                  placeholder="jane@example.com"
                  className="input"
                  value={uploaderEmail}
                  onChange={(e) => setUploaderEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 flex items-center gap-1.5">
                <MessageSquare size={11} /> Message <span className="text-gray-600">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Any notes for the requester…"
                className="input resize-none"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Drop zone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-300 ${
                isDragActive
                  ? "border-brand bg-brand/5"
                  : "border-surface-4 hover:border-brand/40 bg-surface-2 hover:bg-surface-3"
              }`}
            >
              <input {...getInputProps()} />
              <UploadCloud size={24} className={`mx-auto mb-2 ${isDragActive ? "text-brand-glow" : "text-gray-500"}`} />
              <p className="text-sm text-white font-medium">
                {isDragActive ? "Drop files here…" : "Drag & drop or click to add files"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Max {formatBytes(request?.maxFileSizeBytes || MAX_SIZE)} per file
              </p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="space-y-1.5">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-2 border border-surface-4">
                    <span className="text-lg flex-shrink-0">{getFileIcon(f.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{f.name}</p>
                      <p className="text-[11px] text-gray-600 font-mono">{formatBytes(f.size)}</p>
                    </div>
                    <button type="button" onClick={() => removeFile(f.id)} className="text-gray-600 hover:text-accent-red transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !files.length}
              className="btn-primary w-full justify-center py-3"
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> Submitting…</>
              ) : (
                <><UploadCloud size={16} /> Submit {files.length > 0 ? `${files.length} file${files.length !== 1 ? "s" : ""}` : "Files"}</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
