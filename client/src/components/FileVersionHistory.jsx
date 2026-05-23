import { useState, useEffect } from "react";
import { History, RotateCcw, Download, Clock, HardDrive, AlertTriangle, Loader2, CheckCircle2, X } from "lucide-react";
import api from "../utils/api";
import { formatBytes, formatDate } from "../utils/helpers";
import toast from "react-hot-toast";

/**
 * FileVersionHistory — drop this into your FilePreviewModal as a "Versions" tab.
 *
 * Usage:
 *   <FileVersionHistory fileId={file._id} currentVersion={file.currentVersion} onRestore={onRefresh} />
 *
 * Props:
 *   fileId          string   — the file's _id
 *   currentVersion  number   — current version index (usually file.version or file.previousVersions.length)
 *   onRestore       fn       — called after successful restore so parent can refresh
 */
export default function FileVersionHistory({ fileId, onRestore }) {
  const [versions,  setVersions]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [restoring, setRestoring] = useState(null);  // index being restored
  const [confirm,   setConfirm]   = useState(null);  // {index, version}

  useEffect(() => {
    if (!fileId) return;
    setLoading(true);
    api.get(`/api/files/${fileId}`)
      .then(({ data }) => {
        const file = data.file || data;
        const prevs = file.previousVersions || [];
        // Build version list — index 0 is oldest previous, current is the latest
        const list = [
          ...prevs.map((v, i) => ({ ...v, versionIndex: i, isCurrent: false })),
          {
            versionIndex: prevs.length,
            size:         file.size,
            createdAt:    file.updatedAt || file.createdAt,
            isCurrent:    true,
            filename:     file.filename,
          },
        ].reverse(); // newest first
        setVersions(list);
      })
      .catch(() => toast.error("Failed to load version history."))
      .finally(() => setLoading(false));
  }, [fileId]);

  const handleRestore = async (versionIndex) => {
    setRestoring(versionIndex);
    try {
      await api.post(`/api/files/${fileId}/version/${versionIndex}/restore`);
      toast.success(`Restored to version ${versionIndex + 1}.`);
      onRestore?.();
      // Refresh list
      setLoading(true);
      const { data } = await api.get(`/api/files/${fileId}`);
      const file = data.file || data;
      const prevs = file.previousVersions || [];
      const list = [
        ...prevs.map((v, i) => ({ ...v, versionIndex: i, isCurrent: false })),
        { versionIndex: prevs.length, size: file.size, createdAt: file.updatedAt || file.createdAt, isCurrent: true },
      ].reverse();
      setVersions(list);
    } catch (err) {
      toast.error(err.response?.data?.message || "Restore failed.");
    } finally {
      setRestoring(null);
      setConfirm(null);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={22} className="animate-spin text-brand-glow" />
      </div>
    );
  }

  if (versions.length <= 1) {
    return (
      <div className="py-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-surface-3 border border-surface-4 flex items-center justify-center mx-auto mb-3">
          <History size={22} className="text-gray-600" />
        </div>
        <p className="text-gray-400 font-medium">No previous versions</p>
        <p className="text-gray-600 text-sm mt-1">Upload a new version to start tracking history.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Confirm modal */}
      {confirm && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setConfirm(null)}
        >
          <div
            className="bg-surface-1 border border-surface-4 rounded-2xl p-6 max-w-sm w-full animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-900/30 border border-amber-900/50 flex items-center justify-center">
                <AlertTriangle size={18} className="text-accent-amber" />
              </div>
              <h3 className="font-display font-bold text-white">Restore Version {confirm.index + 1}?</h3>
            </div>
            <p className="text-sm text-gray-400 mb-5 leading-relaxed">
              The current file will become a version in history. This action can be undone by restoring again.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="btn-ghost flex-1">Cancel</button>
              <button
                onClick={() => handleRestore(confirm.index)}
                className="btn-primary flex-1 justify-center"
              >
                {restoring === confirm.index ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RotateCcw size={14} />
                )}
                Restore
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-1">
        <History size={14} className="text-gray-500" />
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
          {versions.length} version{versions.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-2">
        {versions.map((v, idx) => (
          <div
            key={v.versionIndex}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              v.isCurrent
                ? "bg-brand/5 border-brand/25"
                : "bg-surface-2 border-surface-4 hover:border-surface-5"
            }`}
          >
            {/* Version badge */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
              v.isCurrent ? "bg-brand/20 text-brand-glow border border-brand/30" : "bg-surface-3 text-gray-400 border border-surface-4"
            }`}>
              v{versions.length - idx}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-200">
                  Version {versions.length - idx}
                </span>
                {v.isCurrent && (
                  <span className="badge bg-brand/20 text-brand-glow border border-brand/20 text-[10px]">
                    Current
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {v.size && (
                  <span className="text-[11px] text-gray-600 flex items-center gap-1">
                    <HardDrive size={10} /> {formatBytes(v.size)}
                  </span>
                )}
                {v.createdAt && (
                  <span className="text-[11px] text-gray-600 flex items-center gap-1">
                    <Clock size={10} /> {formatDate(v.createdAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            {!v.isCurrent && (
              <button
                onClick={() => setConfirm({ index: v.versionIndex })}
                disabled={restoring !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-3 border border-surface-4 text-gray-400 hover:text-white hover:border-brand/30 transition-all text-xs font-medium flex-shrink-0"
              >
                {restoring === v.versionIndex
                  ? <Loader2 size={11} className="animate-spin" />
                  : <RotateCcw size={11} />
                }
                Restore
              </button>
            )}
            {v.isCurrent && (
              <span className="flex items-center gap-1 text-xs text-emerald-500 flex-shrink-0">
                <CheckCircle2 size={12} /> Active
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-600 text-center pt-2">
        Restoring a version replaces the current file and saves the current one to history.
      </p>
    </div>
  );
}
