import { useState, useMemo } from "react";
import { Edit3, X, Loader2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";

export default function BulkRenameModal({ selectedFiles, onComplete, onClose }) {
  const [pattern, setPattern] = useState("file-{n}");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Preview generation
  const previews = useMemo(() => {
    return selectedFiles.slice(0, 5).map((file, index) => {
      const ext = file.originalName.split(".").pop();
      let newName = pattern
        .replace(/{n}/g, (index + 1).toString().padStart(2, "0"))
        .replace(/{name}/g, file.originalName.split(".")[0]);
      
      // Ensure extension is preserved if not included in pattern
      if (!newName.endsWith(`.${ext}`)) {
        newName += `.${ext}`;
      }
      return { old: file.originalName, new: newName };
    });
  }, [pattern, selectedFiles]);

  const handleApply = async () => {
    if (!pattern.trim()) return toast.error("Pattern cannot be empty.");
    
    setLoading(true);
    try {
      // Build rename payload
      const renames = selectedFiles.map((file, index) => {
        const ext = file.originalName.split(".").pop();
        let newName = pattern
          .replace(/{n}/g, (index + 1).toString().padStart(2, "0"))
          .replace(/{name}/g, file.originalName.split(".")[0]);
        
        if (!newName.endsWith(`.${ext}`)) {
          newName += `.${ext}`;
        }
        return { id: file._id, name: newName };
      });

      await api.post("/api/files/batch-rename", { renames });
      setDone(true);
      setTimeout(() => {
        onComplete?.();
        onClose();
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk rename failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-1 border border-surface-4 rounded-2xl w-full max-w-md shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
        
        <div className="flex items-center justify-between p-5 border-b border-surface-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/15 border border-brand/25 flex items-center justify-center">
              <Edit3 size={15} className="text-brand-glow" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-sm">Bulk Rename</h3>
              <p className="text-[11px] text-gray-500">{selectedFiles.length} files selected</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5">
          {done ? (
            <div className="text-center space-y-4 py-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-900/20 border border-emerald-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} className="text-emerald-400" />
              </div>
              <p className="text-white font-medium">Successfully Renamed!</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                  Filename Pattern
                </label>
                <input
                  autoFocus
                  className="input font-mono text-sm"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder="e.g. holiday-{n}"
                />
                <div className="flex gap-2 mt-2">
                  <span className="text-[10px] text-gray-500 bg-surface-2 px-2 py-1 rounded border border-surface-4 cursor-pointer hover:border-brand/40" onClick={() => setPattern("file-{n}")}>file-{`{n}`}</span>
                  <span className="text-[10px] text-gray-500 bg-surface-2 px-2 py-1 rounded border border-surface-4 cursor-pointer hover:border-brand/40" onClick={() => setPattern("{name}-edited")}>{`{name}`}-edited</span>
                  <span className="text-[10px] text-gray-500 bg-surface-2 px-2 py-1 rounded border border-surface-4 cursor-pointer hover:border-brand/40" onClick={() => setPattern("doc-{n}-{name}")}>doc-{`{n}`}-{`{name}`}</span>
                </div>
                <p className="text-[10px] text-gray-600 mt-2">
                  Use <code className="text-brand-glow font-mono">{`{n}`}</code> for numbers (01, 02...) and <code className="text-brand-glow font-mono">{`{name}`}</code> for original name.
                </p>
              </div>

              <div className="card p-3 bg-surface-2 border-surface-4 space-y-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Preview</p>
                {previews.map((p, i) => (
                  <div key={i} className="flex flex-col text-xs border-b border-surface-3 last:border-0 pb-2 last:pb-0">
                    <span className="text-gray-600 line-through truncate">{p.old}</span>
                    <span className="text-gray-300 font-mono truncate">{p.new}</span>
                  </div>
                ))}
                {selectedFiles.length > 5 && (
                  <p className="text-[10px] text-gray-600 pt-1">...and {selectedFiles.length - 5} more files</p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                <button onClick={handleApply} disabled={loading || !pattern.trim()} className="btn-primary flex-1 justify-center">
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Edit3 size={14} />}
                  {loading ? "Renaming…" : "Apply Rename"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
