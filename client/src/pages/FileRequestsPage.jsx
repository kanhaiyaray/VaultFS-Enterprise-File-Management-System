import { useState, useEffect, useCallback } from "react";
import {
  Link2, Plus, Copy, Check, Trash2, ExternalLink, Clock,
  Upload, Download, ChevronDown, ChevronUp, RefreshCw, Loader2,
  Mail, Shield, HardDrive, Calendar, AlertTriangle, Eye,
  FileText, CheckCircle2, X, Settings2, User,
} from "lucide-react";
import api from "../utils/api";
import { formatDate, formatBytes } from "../utils/helpers";
import toast from "react-hot-toast";

/**
 * Enhanced FileRequestsPage
 *
 * New fields vs original:
 *   requireEmail     boolean  — require uploader to provide email
 *   maxFileSizeMB    number   — per-file size limit for this request
 *   expiresAt        Date     — auto-expire the request
 *   maxSubmissions   number   — max number of upload submissions
 *   notifyOnSubmit   boolean  — email owner on each submission (uses sendMail)
 *   allowedTypes     string[] — restrict MIME types
 *
 * Backend model additions for FileRequest (add to your FileRequest schema):
 *   requireEmail:   { type: Boolean, default: false }
 *   maxFileSizeMB:  { type: Number,  default: 50 }
 *   expiresAt:      { type: Date,    default: null }
 *   maxSubmissions: { type: Number,  default: null }
 *   submissionCount:{ type: Number,  default: 0 }
 *   notifyOnSubmit: { type: Boolean, default: true }
 *   uploaderEmails: [String]   — collected emails
 */

const QUICK_EXPIRES = [
  { label: "24 hours", hours: 24    },
  { label: "3 days",   hours: 72    },
  { label: "7 days",   hours: 168   },
  { label: "30 days",  hours: 720   },
  { label: "Never",    hours: null  },
];

const FILE_TYPE_PRESETS = [
  { label: "Any",      types: []                                                    },
  { label: "Images",   types: ["image/jpeg","image/png","image/gif","image/webp"]   },
  { label: "PDFs",     types: ["application/pdf"]                                   },
  { label: "Docs",     types: ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"] },
  { label: "Video",    types: ["video/mp4","video/webm"]                            },
  { label: "Archives", types: ["application/zip"]                                   },
];

function RequestCard({ req, onDelete, onCopy, onExpand, expanded }) {
  const slug = req.slug;
  const shareUrl = `${window.location.origin}/r/${slug}`;
  const isExpired = req.expiresAt && new Date(req.expiresAt) < new Date();
  const isMaxed   = req.maxSubmissions && req.submissionCount >= req.maxSubmissions;
  const inactive  = isExpired || isMaxed || !req.isActive;

  return (
    <div className={`card overflow-hidden transition-all ${inactive ? "opacity-60" : ""}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${
            inactive ? "bg-surface-3 border-surface-4" : "bg-brand/10 border-brand/20"
          }`}>
            <Link2 size={15} className={inactive ? "text-gray-600" : "text-brand-glow"} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium text-white text-sm truncate">{req.title}</h3>
                {req.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{req.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {inactive && (
                  <span className="badge bg-red-900/20 text-accent-red border-red-900/30 text-[10px]">
                    {isExpired ? "Expired" : isMaxed ? "Full" : "Inactive"}
                  </span>
                )}
                {req.requireEmail && (
                  <span title="Requires uploader email" className="badge bg-surface-3 text-gray-500 border-surface-4 text-[10px]">
                    <Mail size={9} className="mr-0.5" />Email
                  </span>
                )}
              </div>
            </div>

            {/* Meta pills */}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[11px] text-gray-600 flex items-center gap-1">
                <Upload size={9} />
                {req.submissionCount || 0} submission{(req.submissionCount || 0) !== 1 ? "s" : ""}
                {req.maxSubmissions && ` / ${req.maxSubmissions}`}
              </span>
              {req.expiresAt && (
                <span className={`text-[11px] flex items-center gap-1 ${isExpired ? "text-accent-red" : "text-gray-600"}`}>
                  <Clock size={9} />
                  {isExpired ? "Expired " : "Expires "}
                  {formatDate(req.expiresAt)}
                </span>
              )}
              {req.maxFileSizeMB && (
                <span className="text-[11px] text-gray-600 flex items-center gap-1">
                  <HardDrive size={9} /> Max {req.maxFileSizeMB}MB/file
                </span>
              )}
            </div>
          </div>
        </div>

        {/* URL bar */}
        <div className="mt-3 flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-surface-2 border border-surface-4 rounded-lg">
            <Link2 size={11} className="text-gray-600 flex-shrink-0" />
            <span className="text-xs font-mono text-gray-400 truncate flex-1">{shareUrl}</span>
          </div>
          <button
            onClick={() => onCopy(shareUrl)}
            className="flex-shrink-0 px-3 py-2 rounded-lg bg-surface-2 border border-surface-4 text-gray-400 hover:text-white hover:border-surface-5 transition-all text-xs flex items-center gap-1.5"
          >
            <Copy size={11} /> Copy
          </button>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-surface-2 border border-surface-4 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
          >
            <ExternalLink size={11} />
          </a>
        </div>
      </div>

      {/* Expand / collapse */}
      <div className="border-t border-surface-3">
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={() => onExpand(req._id)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
          >
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {expanded ? "Hide submissions" : "View submissions"}
            {req.submissionCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-brand/20 text-brand-glow text-[9px] font-bold flex items-center justify-center">
                {req.submissionCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onDelete(req)}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-accent-red transition-colors px-2 py-1"
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>

        {expanded && <SubmissionsList requestId={req._id} />}
      </div>
    </div>
  );
}

function SubmissionsList({ requestId }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/file-requests/${requestId}/submissions`)
      .then(({ data }) => setSubmissions(data.submissions || data.files || []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, [requestId]);

  if (loading) return <div className="flex justify-center p-4"><Loader2 size={16} className="animate-spin text-brand-glow" /></div>;
  if (!submissions.length) return (
    <div className="px-4 pb-4 text-center">
      <p className="text-xs text-gray-600">No submissions yet.</p>
    </div>
  );

  return (
    <div className="px-4 pb-4 space-y-2">
      {submissions.map((s, i) => (
        <div key={s._id || i} className="flex items-center gap-3 p-2.5 bg-surface-2 rounded-lg border border-surface-4">
          <FileText size={13} className="text-gray-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-200 truncate">
              {s.originalName || s.name || "Unnamed file"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {s.uploaderEmail && (
                <span className="text-[10px] text-gray-600 flex items-center gap-1">
                  <User size={8} /> {s.uploaderEmail}
                </span>
              )}
              {s.size && (
                <span className="text-[10px] text-gray-600 font-mono">{formatBytes(s.size)}</span>
              )}
              <span className="text-[10px] text-gray-600">{formatDate(s.createdAt)}</span>
            </div>
          </div>
          {s._id && (
            <a
              href={`/api/files/download/${s._id}`}
              download
              className="text-brand-glow hover:text-white transition-colors p-1"
              title="Download"
            >
              <Download size={12} />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

function CreateRequestModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    title:          "",
    description:    "",
    requireEmail:   false,
    maxFileSizeMB:  50,
    maxSubmissions: "",
    expiresHours:   null,
    notifyOnSubmit: true,
    allowedTypes:   [],
  });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [created, setCreated] = useState(null);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    if (!form.title.trim()) return toast.error("Title is required.");
    setLoading(true);
    try {
      const payload = {
        title:        form.title.trim(),
        description:  form.description.trim() || undefined,
        requireEmail: form.requireEmail,
        maxFileSizeMB: form.maxFileSizeMB || undefined,
        maxSubmissions: form.maxSubmissions ? parseInt(form.maxSubmissions) : undefined,
        expiresAt: form.expiresHours
          ? new Date(Date.now() + form.expiresHours * 3600_000).toISOString()
          : undefined,
        notifyOnSubmit: form.notifyOnSubmit,
        allowedTypes: form.allowedTypes.length ? form.allowedTypes : undefined,
      };
      const { data } = await api.post("/api/file-requests", payload);
      setCreated(data.fileRequest || data);
      onCreate?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create request.");
    } finally {
      setLoading(false);
    }
  };

  const shareUrl = created ? `${window.location.origin}/r/${created.slug}` : "";

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface-1 border border-surface-4 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-up max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/15 border border-brand/25 flex items-center justify-center">
              <Link2 size={15} className="text-brand-glow" />
            </div>
            <h3 className="font-display font-bold text-white">
              {created ? "Request Created!" : "Create File Request"}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {created ? (
          /* Success state */
          <div className="p-5 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-900/20 border border-emerald-900/30 flex items-center justify-center mx-auto">
              <CheckCircle2 size={24} className="text-emerald-400" />
            </div>
            <p className="text-sm text-gray-400">Share this link so others can upload files to you.</p>
            <div className="flex gap-2">
              <input readOnly value={shareUrl} className="input text-xs font-mono flex-1" />
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  toast.success("Copied!");
                }}
                className={`flex-shrink-0 w-10 h-10 rounded-lg border flex items-center justify-center transition-all ${
                  copied ? "bg-emerald-900/20 border-emerald-900/30 text-emerald-400" : "bg-surface-3 border-surface-4 text-gray-400 hover:text-white"
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <a href={shareUrl} target="_blank" rel="noopener noreferrer"
               className="btn-ghost w-full justify-center text-sm">
              <ExternalLink size={13} /> Preview Request Page
            </a>
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </div>
        ) : (
          /* Form */
          <div className="p-5 space-y-4">
            {/* Title & description */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Title *</label>
                <input className="input" placeholder="e.g. Q4 Report Submissions" value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Description</label>
                <textarea className="input resize-none" rows={2} placeholder="Instructions for uploaders…" value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                <Calendar size={11} /> Link Expiry
              </label>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_EXPIRES.map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => set("expiresHours", opt.hours)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      form.expiresHours === opt.hours
                        ? "bg-brand/15 border-brand/30 text-brand-glow"
                        : "bg-surface-2 border-surface-4 text-gray-400 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* File type filter */}
            <div>
              <label className="block text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                <FileText size={11} /> Allowed File Types
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FILE_TYPE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => set("allowedTypes", p.types)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                      JSON.stringify(form.allowedTypes) === JSON.stringify(p.types)
                        ? "bg-brand/15 border-brand/30 text-brand-glow"
                        : "bg-surface-2 border-surface-4 text-gray-400 hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Limits */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <HardDrive size={11} /> Max File Size (MB)
                </label>
                <input type="number" min={1} max={500} className="input text-sm" value={form.maxFileSizeMB}
                  onChange={(e) => set("maxFileSizeMB", parseInt(e.target.value) || 50)} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Upload size={11} /> Max Submissions
                </label>
                <input type="number" min={1} className="input text-sm" placeholder="Unlimited" value={form.maxSubmissions}
                  onChange={(e) => set("maxSubmissions", e.target.value)} />
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-2.5">
              {[
                { key: "requireEmail",   icon: Mail,   label: "Require uploader email", desc: "Collect email from whoever uploads files" },
                { key: "notifyOnSubmit", icon: Shield, label: "Notify me on submission", desc: "Get an email each time files are submitted" },
              ].map(({ key, icon: Icon, label, desc }) => (
                <div key={key} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg border border-surface-4">
                  <div className="flex items-center gap-2.5">
                    <Icon size={13} className="text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-200 font-medium">{label}</p>
                      <p className="text-[11px] text-gray-500">{desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-medium transition-colors ${form[key] ? "text-brand-glow" : "text-gray-600"}`}>
                      {form[key] ? "On" : "Off"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!form[key]}
                      onClick={() => set(key, !form[key])}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
                        form[key] ? "bg-brand" : "bg-surface-4"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                          form[key] ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleCreate} disabled={loading || !form.title.trim()} className="btn-primary flex-1 justify-center">
                {loading ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : <><Plus size={14} /> Create Request</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FileRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expanded,   setExpanded]  = useState({});

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/file-requests");
      setRequests(data.fileRequests || data);
    } catch { toast.error("Failed to load file requests."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleDelete = async (req) => {
    if (!confirm(`Delete "${req.title}"?`)) return;
    try {
      await api.delete(`/api/file-requests/${req._id}`);
      toast.success("Deleted.");
      fetchRequests();
    } catch { toast.error("Delete failed."); }
  };

  const handleCopy = async (url) => {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  };

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {showCreate && (
        <CreateRequestModal onClose={() => setShowCreate(false)} onCreate={fetchRequests} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center">
            <Link2 size={16} className="text-brand-glow" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white">File Requests</h1>
            <p className="text-xs text-gray-500">Share a link so others can upload files directly to you</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchRequests} className="btn-ghost px-3 py-2">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm px-4 py-2">
            <Plus size={14} /> New Request
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-28 skeleton rounded-xl" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="card p-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-3 border border-surface-4 flex items-center justify-center mx-auto mb-4">
            <Link2 size={28} className="text-gray-600" />
          </div>
          <p className="text-gray-400 font-display font-semibold text-lg mb-1">No file requests yet</p>
          <p className="text-gray-600 text-sm mb-5">
            Create a request link and share it — anyone with the link can upload files directly to your vault.
          </p>
          <button onClick={() => setShowCreate(true)} className="btn-primary px-5 py-2.5 mx-auto">
            <Plus size={14} /> Create your first request
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <RequestCard
              key={req._id}
              req={req}
              onDelete={handleDelete}
              onCopy={handleCopy}
              onExpand={toggleExpand}
              expanded={!!expanded[req._id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
