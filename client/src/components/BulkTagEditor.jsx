import { useState } from "react";
import { Tag, Plus, X, Loader2, CheckCircle2, Minus, Hash } from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

/**
 * BulkTagEditor
 *
 * Usage — add a "Bulk Tag" button to your select-mode toolbar in DashboardPage:
 *   {selectMode && selectedIds.size > 0 && (
 *     <BulkTagEditorButton
 *       selectedIds={[...selectedIds]}
 *       onComplete={fetchFiles}
 *     />
 *   )}
 */

function TagInput({ label, tags, onAdd, onRemove, color }) {
  const [input, setInput] = useState("");

  const add = () => {
    const val = input.trim().toLowerCase().replace(/\s+/g, "-");
    if (!val || tags.includes(val)) { setInput(""); return; }
    onAdd(val);
    setInput("");
  };

  return (
    <div>
      <label className={`block text-xs font-medium mb-2 flex items-center gap-1.5 ${color}`}>
        {label}
      </label>
      <div className="flex gap-2 mb-2">
        <div className="relative flex-1">
          <Hash size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input pl-8 text-sm"
            placeholder="Enter tag, press Enter"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          />
        </div>
        <button
          onClick={add}
          disabled={!input.trim()}
          className="btn-ghost px-3"
        >
          <Plus size={14} />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                color.includes("emerald")
                  ? "bg-emerald-900/15 border-emerald-900/25 text-emerald-400"
                  : "bg-red-900/15 border-red-900/25 text-accent-red"
              }`}
            >
              #{tag}
              <button
                onClick={() => onRemove(tag)}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BulkTagEditor({ selectedIds, onComplete, onClose }) {
  const [addTags,    setAddTags]    = useState([]);
  const [removeTags, setRemoveTags] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [done,       setDone]       = useState(false);
  const [result,     setResult]     = useState(null);

  const handleApply = async () => {
    if (!addTags.length && !removeTags.length) {
      return toast.error("Add at least one tag to add or remove.");
    }
    setLoading(true);
    try {
      const { data } = await api.post("/api/files/bulk-tags", {
        fileIds: selectedIds,
        addTags,
        removeTags,
      });
      setResult(data);
      setDone(true);
      onComplete?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Bulk tag update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 border border-surface-4 rounded-2xl w-full max-w-md shadow-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand/15 border border-brand/25 flex items-center justify-center">
              <Tag size={15} className="text-brand-glow" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-sm">Bulk Tag Editor</h3>
              <p className="text-[11px] text-gray-500">
                {selectedIds.length} file{selectedIds.length !== 1 ? "s" : ""} selected
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {done ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-900/20 border border-emerald-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} className="text-emerald-400" />
              </div>
              <p className="text-white font-medium">Tags Updated!</p>
              <p className="text-sm text-gray-400">
                {result?.modifiedCount || selectedIds.length} file(s) updated.
              </p>
              {addTags.length > 0 && (
                <p className="text-xs text-gray-500">
                  Added: {addTags.map((t) => `#${t}`).join(", ")}
                </p>
              )}
              {removeTags.length > 0 && (
                <p className="text-xs text-gray-500">
                  Removed: {removeTags.map((t) => `#${t}`).join(", ")}
                </p>
              )}
              <button onClick={onClose} className="btn-primary w-full justify-center">
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="p-3 bg-surface-2 rounded-lg border border-surface-4 text-xs text-gray-500 space-y-1">
                <p>Changes apply to <strong className="text-gray-300">{selectedIds.length} selected files</strong>.</p>
                <p>Tags are added or removed from existing tags — they won't overwrite them.</p>
              </div>

              <TagInput
                label={<><Plus size={11} /> Tags to Add</>}
                tags={addTags}
                onAdd={(t) => setAddTags((prev) => [...new Set([...prev, t])])}
                onRemove={(t) => setAddTags((prev) => prev.filter((x) => x !== t))}
                color="text-emerald-400"
              />

              <TagInput
                label={<><Minus size={11} /> Tags to Remove</>}
                tags={removeTags}
                onAdd={(t) => setRemoveTags((prev) => [...new Set([...prev, t])])}
                onRemove={(t) => setRemoveTags((prev) => prev.filter((x) => x !== t))}
                color="text-accent-red"
              />

              <div className="flex gap-3 pt-1">
                <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
                <button
                  onClick={handleApply}
                  disabled={loading || (!addTags.length && !removeTags.length)}
                  className="btn-primary flex-1 justify-center"
                >
                  {loading ? (
                    <><Loader2 size={14} className="animate-spin" /> Applying…</>
                  ) : (
                    <><Tag size={14} /> Apply Tags</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
