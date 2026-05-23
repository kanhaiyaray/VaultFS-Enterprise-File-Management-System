import { useState, useEffect, useCallback } from "react";
import {
  Trash2, RotateCcw, X, RefreshCw, AlertTriangle,
  Clock, Search, CheckSquare, Square, ShieldAlert,
} from "lucide-react";
import api from "../utils/api";
import { formatBytes, formatDate, getFileIcon, truncate } from "../utils/helpers";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

function ConfirmModal({ title, message, confirmLabel, onConfirm, onClose, danger = true }) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-1 border border-surface-4 rounded-2xl p-6 max-w-sm w-full animate-fade-up shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? "bg-red-900/30 border border-red-900/50" : "bg-amber-900/30 border border-amber-900/50"}`}>
            <AlertTriangle size={18} className={danger ? "text-accent-red" : "text-accent-amber"} />
          </div>
          <h3 className="font-display font-bold text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 justify-center font-semibold rounded-lg px-4 py-2 text-sm transition-all ${
              danger
                ? "bg-accent-red/15 text-accent-red border border-red-900/40 hover:bg-accent-red/25"
                : "btn-primary"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrashFileRow({ file, isSelected, selectMode, onToggle, onRestore, onDelete }) {
  const daysSinceDelete = file.deletedAt
    ? Math.floor((Date.now() - new Date(file.deletedAt)) / 86400_000)
    : null;

  return (
    <div
      className={`card p-4 flex items-center gap-3 group hover:border-surface-5 transition-all duration-200 ${isSelected ? "border-brand/50 bg-brand/5" : ""}`}
      onClick={() => selectMode && onToggle(file._id)}
    >
      {selectMode && (
        <button onClick={(e) => { e.stopPropagation(); onToggle(file._id); }} className="flex-shrink-0">
          {isSelected ? <CheckSquare size={16} className="text-brand-glow" /> : <Square size={16} className="text-gray-500" />}
        </button>
      )}
      <span className="text-2xl flex-shrink-0 opacity-60">{getFileIcon(file.mimetype)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-300 truncate" title={file.originalName}>
          {truncate(file.originalName, 40)}
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-600 font-mono">{formatBytes(file.size)}</span>
          {file.deletedAt && (
            <span className="text-xs text-gray-600 flex items-center gap-1">
              <Clock size={10} />
              Deleted {daysSinceDelete === 0 ? "today" : `${daysSinceDelete}d ago`}
            </span>
          )}
          {daysSinceDelete !== null && daysSinceDelete >= 25 && (
            <span className="badge bg-red-900/20 text-red-400 text-[10px] border border-red-900/30">
              ⚠ Expiring soon
            </span>
          )}
        </div>
      </div>
      {!selectMode && (
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onRestore(file); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/20 border border-emerald-900/30 text-emerald-400 hover:bg-emerald-900/40 transition-all text-xs font-medium"
          >
            <RotateCcw size={11} /> Restore
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(file); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/15 border border-red-900/30 text-accent-red hover:bg-red-900/30 transition-all text-xs font-medium"
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function TrashPage() {
  const { refreshUser } = useAuth();
  const [files,        setFiles]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);
  const [pagination,   setPagination]   = useState({});
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [selectMode,   setSelectMode]   = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/files/trash", { params: { page, limit: 20 } });
      setFiles(data.files);
      setPagination(data.pagination);
    } catch {
      toast.error("Failed to load trash.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchTrash(); }, [fetchTrash]);

  const toggleSelect = (id) =>
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selectAll    = () => setSelectedIds(new Set(filtered.map((f) => f._id)));
  const clearSelection = () => { setSelectedIds(new Set()); setSelectMode(false); };

  const handleRestore = async (file) => {
    setActionLoading(true);
    try {
      await api.post(`/api/files/${file._id}/restore`);
      toast.success(`"${file.originalName}" restored.`);
      await fetchTrash();
      refreshUser();
    } catch (err) {
      toast.error(err.response?.data?.message || "Restore failed.");
    } finally { setActionLoading(false); }
  };

  const handlePermanentDelete = async (file) => {
    setActionLoading(true);
    try {
      await api.delete(`/api/files/${file._id}/permanent`);
      toast.success("File permanently deleted.");
      await fetchTrash();
    } catch {
      toast.error("Delete failed.");
    } finally { setActionLoading(false); }
  };

  const handleEmptyTrash = async () => {
    setActionLoading(true);
    try {
      const { data } = await api.delete("/api/files/empty-trash");
      toast.success(data.message || "Trash emptied.");
      await fetchTrash();
      refreshUser();
    } catch { toast.error("Failed to empty trash."); }
    finally { setActionLoading(false); }
  };

  const handleBulkRestore = async () => {
    if (!selectedIds.size) return;
    setActionLoading(true);
    let restored = 0;
    for (const id of selectedIds) {
      try { await api.post(`/api/files/${id}/restore`); restored++; } catch {}
    }
    toast.success(`${restored} file(s) restored.`);
    clearSelection(); await fetchTrash(); refreshUser(); setActionLoading(false);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    setActionLoading(true);
    let deleted = 0;
    for (const id of selectedIds) {
      try { await api.delete(`/api/files/${id}/permanent`); deleted++; } catch {}
    }
    toast.success(`${deleted} file(s) permanently deleted.`);
    clearSelection(); await fetchTrash(); setActionLoading(false);
  };

  const filtered = search
    ? files.filter((f) => f.originalName?.toLowerCase().includes(search.toLowerCase()))
    : files;

  const totalSize = files.reduce((s, f) => s + (f.size || 0), 0);

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {confirmModal && (
        <ConfirmModal {...confirmModal} onClose={() => setConfirmModal(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-900/20 border border-red-900/30 flex items-center justify-center">
            <Trash2 size={16} className="text-accent-red" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white">Trash</h1>
            <p className="text-xs text-gray-500">
              {pagination.total || 0} file{(pagination.total || 0) !== 1 ? "s" : ""} · {formatBytes(totalSize)} used
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={fetchTrash} disabled={loading} className="btn-ghost text-sm px-3 py-2">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          {!selectMode ? (
            <>
              <button onClick={() => setSelectMode(true)} className="btn-ghost text-sm">
                <CheckSquare size={14} /> Select
              </button>
              {files.length > 0 && (
                <button
                  disabled={actionLoading}
                  onClick={() => setConfirmModal({
                    title: "Empty Trash",
                    message: `Permanently delete all ${pagination.total} file(s)? Cannot be undone.`,
                    confirmLabel: "Empty Trash",
                    danger: true,
                    onConfirm: handleEmptyTrash,
                  })}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm bg-red-900/15 border border-red-900/30 text-accent-red hover:bg-red-900/30 transition-all"
                >
                  <ShieldAlert size={13} /> Empty Trash
                </button>
              )}
            </>
          ) : (
            <>
              <span className="text-xs text-gray-400">{selectedIds.size} selected</span>
              <button onClick={selectAll} className="btn-ghost text-xs px-3 py-1.5">All</button>
              <button
                disabled={!selectedIds.size || actionLoading}
                onClick={() => setConfirmModal({
                  title: "Restore Files",
                  message: `Restore ${selectedIds.size} file(s) to your vault?`,
                  confirmLabel: "Restore", danger: false,
                  onConfirm: handleBulkRestore,
                })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-900/20 border border-emerald-900/30 text-emerald-400 hover:bg-emerald-900/40 transition-all"
              >
                <RotateCcw size={11} /> Restore
              </button>
              <button
                disabled={!selectedIds.size || actionLoading}
                onClick={() => setConfirmModal({
                  title: "Permanent Delete",
                  message: `Permanently delete ${selectedIds.size} file(s)? Cannot be undone.`,
                  confirmLabel: "Delete Forever", danger: true,
                  onConfirm: handleBulkDelete,
                })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-900/15 border border-red-900/30 text-accent-red hover:bg-red-900/30 transition-all"
              >
                <Trash2 size={11} /> Delete
              </button>
              <button onClick={clearSelection} className="btn-ghost text-xs px-2.5 py-1.5">
                <X size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-900/10 border border-amber-900/20">
        <AlertTriangle size={13} className="text-accent-amber mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-300/80 leading-relaxed">
          Files in trash can be restored at any time. Emptying trash permanently removes files from disk.
          Files deleted more than 30 days ago may be auto-purged.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter trash…"
          className="input pl-9"
        />
      </div>

      {/* File list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-16 skeleton rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-3 border border-surface-4 flex items-center justify-center mx-auto mb-4">
            <Trash2 size={28} className="text-gray-600" />
          </div>
          <p className="text-gray-400 font-display font-semibold text-lg">
            {files.length === 0 ? "Trash is empty" : "No matching files"}
          </p>
          <p className="text-gray-600 text-sm mt-1">
            {files.length === 0
              ? "Deleted files appear here and can be restored any time."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((file) => (
            <TrashFileRow
              key={file._id}
              file={file}
              isSelected={selectedIds.has(file._id)}
              selectMode={selectMode}
              onToggle={toggleSelect}
              onRestore={(f) => setConfirmModal({
                title: "Restore File",
                message: `Restore "${f.originalName}" to your vault?`,
                confirmLabel: "Restore", danger: false,
                onConfirm: () => handleRestore(f),
              })}
              onDelete={(f) => setConfirmModal({
                title: "Permanent Delete",
                message: `"${f.originalName}" will be deleted forever. This cannot be undone.`,
                confirmLabel: "Delete Forever", danger: true,
                onConfirm: () => handlePermanentDelete(f),
              })}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-sm px-3 py-2">
            Previous
          </button>
          <span className="text-sm text-gray-500 font-mono">{page} / {pagination.pages}</span>
          <button onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} className="btn-ghost text-sm px-3 py-2">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
