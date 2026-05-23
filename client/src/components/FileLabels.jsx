/**
 * FileLabels — Color-coded label system for files
 *
 * Files get a `labels` array: [{ name, color }]
 * Stored in the File model. Backend endpoint: PUT /api/files/:id (update labels field)
 *
 * Components exported:
 *   LabelDot         — small colored circle (used in file list rows)
 *   LabelPicker      — popover to add/remove labels from a file
 *   LabelFilterBar   — horizontal bar to filter file list by label
 *
 * Add `labels: [{ name: String, color: String }]` to File model.
 *
 * Integration in DashboardPage file row:
 *   <LabelDot labels={file.labels} />
 *
 * Integration in FilePreviewModal toolbar:
 *   <LabelPicker file={file} onUpdate={handleFileUpdate} />
 *
 * Integration in DashboardPage header:
 *   <LabelFilterBar activeLabel={labelFilter} onChange={setLabelFilter} />
 */

import { useState, useRef, useEffect } from "react";
import { Tag, Check, X, Plus, Pencil } from "lucide-react";
import api from "../utils/api";
import toast from "react-hot-toast";

// ── Predefined palette ────────────────────────────────────────────────────────
export const LABEL_COLORS = [
  { name: "Red",    value: "#ef4444", bg: "bg-red-500"    },
  { name: "Orange", value: "#f97316", bg: "bg-orange-500" },
  { name: "Amber",  value: "#f59e0b", bg: "bg-amber-500"  },
  { name: "Green",  value: "#22c55e", bg: "bg-green-500"  },
  { name: "Teal",   value: "#14b8a6", bg: "bg-teal-500"   },
  { name: "Blue",   value: "#3b82f6", bg: "bg-blue-500"   },
  { name: "Violet", value: "#8b5cf6", bg: "bg-violet-500" },
  { name: "Pink",   value: "#ec4899", bg: "bg-pink-500"   },
  { name: "Gray",   value: "#6b7280", bg: "bg-gray-500"   },
];

// ── LABEL_PRESETS — common label names ───────────────────────────────────────
const PRESETS = ["Important", "Review", "Archive", "Draft", "Done", "Urgent", "Personal", "Work", "Shared"];

// ── LabelDot ──────────────────────────────────────────────────────────────────
export function LabelDot({ labels = [], maxShow = 3, size = 8 }) {
  if (!labels?.length) return null;
  return (
    <span className="inline-flex items-center gap-0.5">
      {labels.slice(0, maxShow).map((l, i) => (
        <span
          key={i}
          title={l.name}
          className="rounded-full flex-shrink-0"
          style={{
            width:  `${size}px`,
            height: `${size}px`,
            backgroundColor: l.color || "#6b7280",
          }}
        />
      ))}
      {labels.length > maxShow && (
        <span className="text-[9px] text-gray-500 ml-0.5">+{labels.length - maxShow}</span>
      )}
    </span>
  );
}

// ── LabelBadge ────────────────────────────────────────────────────────────────
export function LabelBadge({ label, onRemove }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundColor: label.color || "#6b7280" }}
    >
      {label.name}
      {onRemove && (
        <button onClick={onRemove} className="opacity-70 hover:opacity-100 transition-opacity">
          <X size={9} />
        </button>
      )}
    </span>
  );
}

// ── LabelPicker ───────────────────────────────────────────────────────────────
export function LabelPicker({ file, onUpdate }) {
  const [open,     setOpen]     = useState(false);
  const [labels,   setLabels]   = useState(file?.labels || []);
  const [newName,  setNewName]  = useState("");
  const [newColor, setNewColor] = useState(LABEL_COLORS[5].value);
  const [saving,   setSaving]   = useState(false);
  const ref = useRef(null);

  // Sync if file prop changes
  useEffect(() => { setLabels(file?.labels || []); }, [file]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const saveLabels = async (newLabels) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/api/files/${file._id}`, { labels: newLabels });
      setLabels(newLabels);
      onUpdate?.({ ...file, labels: newLabels });
      toast.success("Labels updated.");
    } catch { toast.error("Failed to update labels."); }
    finally { setSaving(false); }
  };

  const addLabel = () => {
    const name = newName.trim() || "Label";
    if (labels.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("Label already applied.");
    }
    const updated = [...labels, { name, color: newColor }];
    setNewName("");
    saveLabels(updated);
  };

  const removeLabel = (i) => {
    const updated = labels.filter((_, idx) => idx !== i);
    saveLabels(updated);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border bg-surface-2 border-surface-4 text-gray-400 hover:text-white hover:border-surface-5 transition-all"
        title="Manage labels"
      >
        <Tag size={12} />
        Labels
        {labels.length > 0 && <LabelDot labels={labels} maxShow={3} size={6} />}
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 w-64 bg-surface-1 border border-surface-4 rounded-xl shadow-2xl z-30 animate-fade-up overflow-hidden">
          {/* Current labels */}
          {labels.length > 0 && (
            <div className="p-3 border-b border-surface-3">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Applied</p>
              <div className="flex flex-wrap gap-1.5">
                {labels.map((l, i) => (
                  <LabelBadge key={i} label={l} onRemove={() => removeLabel(i)} />
                ))}
              </div>
            </div>
          )}

          {/* Presets */}
          <div className="p-3 border-b border-surface-3">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2">Quick Add</p>
            <div className="flex flex-wrap gap-1">
              {PRESETS.filter((p) => !labels.some((l) => l.name === p)).map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    const updated = [...labels, { name: preset, color: newColor }];
                    saveLabels(updated);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] bg-surface-3 border border-surface-4 text-gray-400 hover:text-white transition-colors"
                >
                  + {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Custom label */}
          <div className="p-3 space-y-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider">Custom Label</p>
            <div className="flex gap-2">
              <input
                className="input text-xs flex-1 py-1.5"
                placeholder="Label name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLabel()}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {LABEL_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewColor(c.value)}
                  title={c.name}
                  className={`w-5 h-5 rounded-full transition-transform ${newColor === c.value ? "scale-125 ring-2 ring-white/40" : "hover:scale-110"}`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
            <button
              onClick={addLabel}
              disabled={saving}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs bg-surface-3 border border-surface-4 text-gray-300 hover:text-white rounded-lg transition-colors"
            >
              <Plus size={11} /> Add Label
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── LabelFilterBar ────────────────────────────────────────────────────────────
export function LabelFilterBar({ files = [], activeLabel, onChange }) {
  // Collect all unique labels from files
  const allLabels = [];
  const seen = new Set();
  for (const file of files) {
    for (const l of (file.labels || [])) {
      if (!seen.has(l.name)) {
        seen.add(l.name);
        allLabels.push(l);
      }
    }
  }

  if (allLabels.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-[10px] text-gray-600 flex-shrink-0 uppercase tracking-wider">Labels:</span>
      <button
        onClick={() => onChange(null)}
        className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs border transition-all ${
          !activeLabel ? "bg-surface-3 border-surface-4 text-white" : "border-surface-4 text-gray-500 hover:text-white"
        }`}
      >
        All
      </button>
      {allLabels.map((l) => (
        <button
          key={l.name}
          onClick={() => onChange(activeLabel === l.name ? null : l.name)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-all ${
            activeLabel === l.name ? "border-white/30 text-white" : "border-surface-4 text-gray-400 hover:text-white"
          }`}
          style={activeLabel === l.name ? { backgroundColor: l.color + "22", borderColor: l.color + "55" } : {}}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
          {l.name}
        </button>
      ))}
    </div>
  );
}
