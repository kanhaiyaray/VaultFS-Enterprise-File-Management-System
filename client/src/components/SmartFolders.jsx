/**
 * SmartFolders — virtual rule-based collections
 *
 * A "Smart Folder" is a saved filter that auto-populates based on rules:
 *   - mimetype prefix   (e.g. "image/*")
 *   - tag match         (e.g. files tagged "invoice")
 *   - filename pattern  (regex or glob)
 *   - date range        (uploaded before/after)
 *   - min/max size
 *   - starred only
 *
 * All evaluation happens client-side against the loaded file list —
 * no new backend model needed (rules saved in localStorage or a simple
 * user settings endpoint).
 *
 * Backend option: POST /api/smart-folders  (optional, for cross-device sync)
 * Simple option:  localStorage "vaultfs_smart_folders"
 *
 * Usage in DashboardPage sidebar or filter bar:
 *   import { SmartFolderSidebar, useSmartFolders } from "../components/SmartFolders";
 *
 *   const { folders, activeFolder, setActive, filterFiles } = useSmartFolders(allFiles);
 *   <SmartFolderSidebar folders={folders} active={activeFolder} onSelect={setActive} />
 *   const visibleFiles = filterFiles(allFiles, activeFolder);
 */

import { useState, useCallback, useMemo } from "react";
import {
  Folder, FolderOpen, Plus, Trash2, Edit3, Save, X,
  Filter, Star, Tag, Image, FileText, Clock, HardDrive,
  ChevronRight, Check, Zap,
} from "lucide-react";

// ── Storage ───────────────────────────────────────────────────────────────────
const STORAGE_KEY = "vaultfs_smart_folders";

function loadFolders() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}
function saveFolders(folders) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(folders));
}

// ── Default built-in smart folders ───────────────────────────────────────────
export const BUILTIN_FOLDERS = [
  {
    id:    "__starred__",
    name:  "Starred",
    icon:  "star",
    color: "#f59e0b",
    rules: { starred: true },
    builtin: true,
  },
  {
    id:    "__images__",
    name:  "Images",
    icon:  "image",
    color: "#3b82f6",
    rules: { mimePrefix: "image/" },
    builtin: true,
  },
  {
    id:    "__documents__",
    name:  "Documents",
    icon:  "file-text",
    color: "#8b5cf6",
    rules: { mimePrefix: "application/" },
    builtin: true,
  },
  {
    id:    "__videos__",
    name:  "Videos",
    icon:  "video",
    color: "#ef4444",
    rules: { mimePrefix: "video/" },
    builtin: true,
  },
  {
    id:    "__recent__",
    name:  "Recent (7d)",
    icon:  "clock",
    color: "#14b8a6",
    rules: { daysAgo: 7 },
    builtin: true,
  },
  {
    id:    "__large__",
    name:  "Large Files",
    icon:  "hard-drive",
    color: "#f97316",
    rules: { minSizeMB: 10 },
    builtin: true,
  },
];

// ── Rule evaluator ────────────────────────────────────────────────────────────
export function evaluateRules(file, rules = {}) {
  if (!file) return false;

  if (rules.starred && !file.isStarred) return false;

  if (rules.mimePrefix && !file.mimetype?.startsWith(rules.mimePrefix)) return false;

  if (rules.mimeExact && file.mimetype !== rules.mimeExact) return false;

  if (rules.tag) {
    const tags = Array.isArray(rules.tag) ? rules.tag : [rules.tag];
    const fileTags = file.tags || [];
    if (!tags.some((t) => fileTags.includes(t))) return false;
  }

  if (rules.namePattern) {
    try {
      const re = new RegExp(rules.namePattern, "i");
      if (!re.test(file.originalName || "")) return false;
    } catch {}
  }

  if (rules.daysAgo) {
    const cutoff = new Date(Date.now() - rules.daysAgo * 86400_000);
    if (new Date(file.createdAt) < cutoff) return false;
  }

  if (rules.dateFrom && new Date(file.createdAt) < new Date(rules.dateFrom)) return false;
  if (rules.dateTo   && new Date(file.createdAt) > new Date(rules.dateTo))   return false;

  if (rules.minSizeMB && file.size < rules.minSizeMB * 1024 * 1024) return false;
  if (rules.maxSizeMB && file.size > rules.maxSizeMB * 1024 * 1024) return false;

  return true;
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSmartFolders(allFiles = []) {
  const [customFolders, setCustom] = useState(loadFolders);
  const [activeId, setActiveId]    = useState(null);

  const folders = useMemo(() => [...BUILTIN_FOLDERS, ...customFolders], [customFolders]);

  const activeFolder = folders.find((f) => f.id === activeId) || null;

  const filteredFiles = useMemo(() => {
    if (!activeFolder) return allFiles;
    return allFiles.filter((file) => evaluateRules(file, activeFolder.rules));
  }, [allFiles, activeFolder]);

  const createFolder = useCallback((folder) => {
    const id      = `custom_${Date.now()}`;
    const newList = [...customFolders, { ...folder, id }];
    setCustom(newList);
    saveFolders(newList);
    return id;
  }, [customFolders]);

  const updateFolder = useCallback((id, updates) => {
    const newList = customFolders.map((f) => f.id === id ? { ...f, ...updates } : f);
    setCustom(newList);
    saveFolders(newList);
  }, [customFolders]);

  const deleteFolder = useCallback((id) => {
    const newList = customFolders.filter((f) => f.id !== id);
    setCustom(newList);
    saveFolders(newList);
    if (activeId === id) setActiveId(null);
  }, [customFolders, activeId]);

  const getCount = useCallback((folder) =>
    allFiles.filter((file) => evaluateRules(file, folder.rules)).length,
  [allFiles]);

  return {
    folders, activeFolder, activeId, setActiveId, filteredFiles,
    createFolder, updateFolder, deleteFolder, getCount,
  };
}

// ── Icon resolver ─────────────────────────────────────────────────────────────
const ICON_MAP = { star: Star, image: Image, "file-text": FileText, clock: Clock, "hard-drive": HardDrive, folder: Folder, filter: Filter, zap: Zap };
function FolderIcon({ icon, size = 13, className }) {
  const Icon = ICON_MAP[icon] || Folder;
  return <Icon size={size} className={className} />;
}

// ── SmartFolderSidebar ─────────────────────────────────────────────────────────
export function SmartFolderSidebar({ folders = BUILTIN_FOLDERS, activeId, onSelect, getCount, onDelete, showCreate }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-2 py-1">
        Smart Folders
      </p>

      {/* "All Files" reset */}
      <button
        onClick={() => onSelect(null)}
        className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
          !activeId ? "bg-brand/10 text-brand-glow" : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
        }`}
      >
        <Folder size={13} className={!activeId ? "text-brand-glow" : "text-gray-600"} />
        All Files
      </button>

      {folders.map((f) => {
        const isActive = activeId === f.id;
        const count    = getCount?.(f) ?? 0;
        return (
          <div key={f.id} className="group relative">
            <button
              onClick={() => onSelect(isActive ? null : f.id)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-300 hover:bg-surface-3"
              }`}
              style={isActive ? { background: f.color + "18", color: f.color } : {}}
            >
              <FolderIcon icon={f.icon} size={13} className={isActive ? "" : "text-gray-600"} style={isActive ? { color: f.color } : {}} />
              <span className="flex-1 text-left truncate">{f.name}</span>
              {count > 0 && (
                <span className={`text-[10px] font-bold font-mono ${isActive ? "" : "text-gray-700 group-hover:text-gray-500"}`}>
                  {count}
                </span>
              )}
            </button>
            {!f.builtin && onDelete && (
              <button
                onClick={() => onDelete(f.id)}
                className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-accent-red transition-all rounded"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        );
      })}

      {showCreate && (
        <button
          onClick={showCreate}
          className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-gray-600 hover:text-gray-400 transition-colors border border-dashed border-surface-4 hover:border-surface-5 mt-1"
        >
          <Plus size={11} /> New Smart Folder
        </button>
      )}
    </div>
  );
}

// ── CreateSmartFolderModal ─────────────────────────────────────────────────────
const FOLDER_ICONS  = ["folder", "star", "image", "file-text", "clock", "hard-drive", "filter", "zap"];
const FOLDER_COLORS = ["#7c3aed","#3b82f6","#22c55e","#f59e0b","#ef4444","#ec4899","#14b8a6","#f97316"];

export function CreateSmartFolderModal({ onClose, onCreate }) {
  const [name,  setName]  = useState("");
  const [icon,  setIcon]  = useState("folder");
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [rules, setRules] = useState({});
  const [tagInput, setTagInput] = useState("");

  const setRule  = (k, v) => setRules((p) => ({ ...p, [k]: v || undefined }));
  const clearRule = (k)   => setRules((p) => { const n = { ...p }; delete n[k]; return n; });

  const handleSave = () => {
    if (!name.trim()) return;
    onCreate?.({ name: name.trim(), icon, color, rules });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface-1 border border-surface-4 rounded-2xl w-full max-w-md shadow-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-surface-3">
          <h3 className="font-display font-bold text-white flex items-center gap-2">
            <Zap size={15} className="text-brand-glow" /> New Smart Folder
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Name *</label>
            <input className="input" placeholder="e.g. Client Invoices" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          {/* Icon + Color */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-2">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {FOLDER_ICONS.map((ic) => (
                  <button
                    key={ic}
                    onClick={() => setIcon(ic)}
                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all ${
                      icon === ic ? "border-brand/40 bg-brand/15" : "border-surface-4 bg-surface-2 hover:bg-surface-3"
                    }`}
                    style={icon === ic ? { color } : {}}
                  >
                    <FolderIcon icon={ic} size={14} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-2">Color</label>
              <div className="flex flex-wrap gap-1.5">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-white/30" : "hover:scale-110"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Filter Rules</p>

            {/* File type */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">File type starts with</label>
              <input className="input text-sm" placeholder="e.g. image/" value={rules.mimePrefix || ""} onChange={(e) => setRule("mimePrefix", e.target.value)} />
            </div>

            {/* Tag */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Tagged with</label>
              <input className="input text-sm" placeholder="e.g. invoice" value={rules.tag || ""} onChange={(e) => setRule("tag", e.target.value)} />
            </div>

            {/* Filename pattern */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Filename contains (regex)</label>
              <input className="input text-sm font-mono" placeholder="e.g. Q[1-4]-202\d" value={rules.namePattern || ""} onChange={(e) => setRule("namePattern", e.target.value)} />
            </div>

            {/* Days ago */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Uploaded within last N days</label>
              <input type="number" className="input text-sm" placeholder="e.g. 30" value={rules.daysAgo || ""} onChange={(e) => setRule("daysAgo", parseInt(e.target.value) || undefined)} />
            </div>

            {/* Size */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Min size (MB)</label>
                <input type="number" className="input text-sm" placeholder="0" value={rules.minSizeMB || ""} onChange={(e) => setRule("minSizeMB", parseFloat(e.target.value) || undefined)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Max size (MB)</label>
                <input type="number" className="input text-sm" placeholder="∞" value={rules.maxSizeMB || ""} onChange={(e) => setRule("maxSizeMB", parseFloat(e.target.value) || undefined)} />
              </div>
            </div>

            {/* Starred */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!rules.starred}
                  onChange={(e) => e.target.checked ? setRule("starred", true) : clearRule("starred")}
                  className="w-4 h-4 rounded border-surface-5 bg-surface-3 accent-brand cursor-pointer"
                />
                <span className="text-sm text-gray-400">Starred files only</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} disabled={!name.trim()} className="btn-primary flex-1 justify-center">
              <Save size={14} /> Create Folder
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
