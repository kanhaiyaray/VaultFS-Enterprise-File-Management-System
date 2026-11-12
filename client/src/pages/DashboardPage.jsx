import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  CheckSquare, ChevronDown, ChevronUp, FolderOpen, GitCompare, Grid3X3, Link2, List, Palette,
  RefreshCw, Search, SlidersHorizontal, Square, Star, Tag, Trash2, Upload, UploadCloud, X, Clock3,
  Download, Copy, Edit3, ChevronUp as ChevronUpIcon, Maximize2
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useActionHistory } from "../context/ActionHistoryContext";
import { useSocket } from "../hooks/useSocket";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { formatBytes, formatDate, getFileIcon, truncate } from "../utils/helpers";
import FilePreviewModal from "../components/FilePreviewModal";
import AdvancedSearch from "../components/AdvancedSearch";
import BulkTagEditor from "../components/BulkTagEditor";
import BulkRenameModal from "../components/BulkRenameModal";
import FileDiffViewer from "../components/FileDiffViewer";
import { LabelDot, LabelFilterBar } from "../components/FileLabels";
import { CreateSmartFolderModal, SmartFolderSidebar, useSmartFolders } from "../components/SmartFolders";
import VirtualFileBrowser from "../components/VirtualFileBrowser";
import { useFileOrganizer } from "../hooks/useFileOrganizer";

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return "—";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const MIME_GROUPS = {
  Images: "#8b5cf6", Videos: "#22d3ee", Audio: "#f59e0b",
  PDFs: "#34d399", Archives: "#ec4899", Docs: "#a78bfa",
  Text: "#64748b", Other: "#71717a",
};

function groupMime(mime) {
  if (!mime) return "Other";
  if (mime.startsWith("image/")) return "Images";
  if (mime.startsWith("video/")) return "Videos";
  if (mime.startsWith("audio/")) return "Audio";
  if (mime === "application/pdf") return "PDFs";
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("archive")) return "Archives";
  if (mime.includes("word") || mime.includes("document")) return "Docs";
  if (mime.includes("excel") || mime.includes("sheet")) return "Docs";
  if (mime.startsWith("text/")) return "Text";
  return "Other";
}

// ── File Card with hover toolbar ─────────────────────────────────────────────
function FileCard({ file, isSelected, selectMode, isFocused, onToggle, onOpen, onStar, onQuickShare, onDownload, onDelete, onContextMenu }) {
  const accentColor = file.organizer?.color;
  const hasThumbnail = file.thumbnailUrl || (file.mimetype?.startsWith("image/") && file.url);

  return (
    <div
      onClick={(e) => (selectMode ? onToggle(file._id, e) : onOpen(file))}
      onContextMenu={(e) => onContextMenu?.(e, file)}
      title={!selectMode ? "Click to preview · Right-click for menu" : undefined}
      className={`card group cursor-pointer overflow-hidden transition-all duration-150 hover:border-surface-5 ${isSelected ? "border-brand/50 bg-brand/5" : ""} ${isFocused ? "ring-2 ring-brand ring-offset-2 ring-offset-surface-0" : ""}`}
      style={accentColor ? { boxShadow: `inset 0 0 0 1px ${accentColor}55` } : undefined}
    >
      <div className="aspect-video bg-surface-2 flex items-center justify-center relative overflow-hidden">
        {hasThumbnail ? (
          <img
            src={file.thumbnailUrl || file.url}
            alt={file.originalName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => { e.target.style.display = "none"; }}
          />
        ) : (
          <span className="text-4xl opacity-50">{getFileIcon(file.mimetype)}</span>
        )}

        {selectMode && (
          <div className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isSelected ? "bg-brand border-brand" : "border-white/70"}`}>
              {isSelected && <CheckSquare size={16} className="text-white" />}
            </div>
          </div>
        )}

        {!selectMode && (
          <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); onStar?.(file._id, !file.isStarred); }}
              className={`w-7 h-7 rounded-lg backdrop-blur-sm flex items-center justify-center transition-colors ${file.isStarred ? "bg-yellow-900/40 text-yellow-400 border border-yellow-900/30" : "bg-black/40 text-white hover:bg-black/60"}`}
              title={file.isStarred ? "Unstar" : "Star"}>
              <Star size={12} className={file.isStarred ? "fill-yellow-400" : ""} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onQuickShare?.(file); }}
              className="w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 flex items-center justify-center transition-colors"
              title="Copy share link (24h)">
              <Link2 size={12} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDownload?.(file); }}
              className="w-7 h-7 rounded-lg bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 flex items-center justify-center transition-colors"
              title="Download">
              <Download size={12} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete?.(file._id); }}
              className="w-7 h-7 rounded-lg bg-red-900/60 backdrop-blur-sm text-white hover:bg-red-900/80 flex items-center justify-center transition-colors"
              title="Delete">
              <Trash2 size={12} />
            </button>
          </div>
        )}

        {file.isStarred && !selectMode && (
          <div className="absolute top-2 right-2">
            <Star size={12} className="text-yellow-400 fill-yellow-400 drop-shadow-sm" />
          </div>
        )}

        {file.labels?.length > 0 && (
          <div className="absolute bottom-2 left-2">
            <LabelDot labels={file.labels} size={7} maxShow={3} />
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-xs font-medium text-gray-200 truncate" title={file.originalName}>{truncate(file.originalName, 28)}</p>
        {file.organizer?.aliases?.length > 0 && (
          <p className="text-[10px] text-brand-glow truncate mt-1">@{file.organizer.aliases[0]}</p>
        )}
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-[10px] text-gray-600 font-mono">{formatBytes(file.size)}</p>
          {file.organizer?.relationships?.length > 0 && (
            <span className="text-[10px] text-gray-600 flex items-center gap-1"><Link2 size={10} /> {file.organizer.relationships.length}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── File Row with hover toolbar + inline rename ─────────────────────────────
function FileRow({ file, isSelected, selectMode, isFocused, onToggle, onOpen, onStar, onQuickShare, onDownload, onDelete, onContextMenu, isRenaming, onRenameCommit, onRenameCancel }) {
  const accentColor = file.organizer?.color;
  const [editName, setEditName] = useState(file.originalName);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => { setEditName(file.originalName); }, [file.originalName]);

  return (
    <div
      onClick={(e) => (selectMode ? onToggle(file._id, e) : onOpen(file))}
      onContextMenu={(e) => onContextMenu?.(e, file)}
      title={!selectMode ? "Click to preview · Right-click for menu" : undefined}
      className={`card p-3 flex items-center gap-3 group cursor-pointer hover:border-surface-5 transition-all duration-150 ${isSelected ? "border-brand/50 bg-brand/5" : ""} ${isFocused ? "ring-2 ring-brand ring-offset-2 ring-offset-surface-0" : ""}`}
      style={accentColor ? { boxShadow: `inset 3px 0 0 ${accentColor}` } : undefined}
    >
      {selectMode && (
        <button onClick={(e) => { e.stopPropagation(); onToggle(file._id, e); }} className="flex-shrink-0">
          {isSelected ? <CheckSquare size={15} className="text-brand-glow" /> : <Square size={15} className="text-gray-600" />}
        </button>
      )}

      {file.thumbnailUrl ? (
        <img src={file.thumbnailUrl} alt="" className="w-9 h-9 rounded object-cover flex-shrink-0 border border-surface-4"
          onError={(e) => { e.target.style.display = "none"; }} />
      ) : (
        <span className="text-xl flex-shrink-0 w-9 text-center">{getFileIcon(file.mimetype)}</span>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isRenaming ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <input
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onRenameCommit?.(file._id, editName);
                  if (e.key === "Escape") onRenameCancel?.();
                }}
                onBlur={() => onRenameCommit?.(file._id, editName)}
                className="input text-xs flex-1 py-1"
              />
            </div>
          ) : (
            <>
              <p
                onDoubleClick={(e) => { e.stopPropagation(); if (!selectMode) onContextMenu?.({ preventDefault: () => {}, stopPropagation: () => {}, _rename: true }, file); }}
                className="text-sm font-medium text-gray-200 truncate"
                title={`${file.originalName} (double-click to rename)`}
              >
                {truncate(file.originalName, 50)}
              </p>
              {file.isStarred && <Star size={10} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
              <LabelDot labels={file.labels} size={7} maxShow={3} />
              {file.organizer?.aliases?.length > 0 && (
                <span className="text-[10px] text-brand-glow font-mono">@{file.organizer.aliases[0]}</span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-[11px] text-gray-600 font-mono">{formatBytes(file.size)}</span>
          <span className="text-[11px] text-gray-600">{formatDate(file.createdAt)}</span>
          {file.organizer?.relationships?.length > 0 && (
            <span className="text-[11px] text-gray-600 flex items-center gap-1"><Link2 size={10} /> {file.organizer.relationships.length}</span>
          )}
          {file.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] text-gray-700 font-mono">#{tag}</span>
          ))}
        </div>
      </div>

      {!selectMode && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onStar?.(file._id, !file.isStarred); }}
            className={`p-1.5 rounded transition-colors ${file.isStarred ? "text-yellow-400 bg-yellow-900/15" : "text-gray-500 hover:text-yellow-400 hover:bg-yellow-900/10"}`}
            title={file.isStarred ? "Unstar" : "Star"}>
            <Star size={13} className={file.isStarred ? "fill-yellow-400" : ""} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onQuickShare?.(file); }}
            className="p-1.5 rounded text-gray-500 hover:text-brand-glow hover:bg-brand/10 transition-colors"
            title="Copy share link">
            <Link2 size={13} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDownload?.(file); }}
            className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-surface-3 transition-colors"
            title="Download">
            <Download size={13} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete?.(file._id); }}
            className="p-1.5 rounded text-gray-500 hover:text-accent-red hover:bg-red-900/10 transition-colors"
            title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

const SORT_OPTIONS = [
  { label: "Newest first", value: "createdAt:desc" },
  { label: "Oldest first", value: "createdAt:asc" },
  { label: "Largest", value: "size:desc" },
  { label: "Smallest", value: "size:asc" },
  { label: "Name A-Z", value: "originalName:asc" },
  { label: "Name Z-A", value: "originalName:desc" },
];

const ORGANIZER_VIEWS = [
  { id: "all", label: "All", icon: FolderOpen },
  { id: "recent", label: "Recent", icon: Clock3 },
  { id: "aliases", label: "Aliases", icon: Tag },
  { id: "relationships", label: "Related", icon: Link2 },
  { id: "colored", label: "Colored", icon: Palette },
];

// ── Main Dashboard ──────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const { pushAction } = useActionHistory();
  const { on, off } = useSocket();
  const socketRef = useRef({ on, off });
  useEffect(() => { socketRef.current = { on, off }; }, [on, off]);

  const location = useLocation();
  const fileListContainerRef = useRef(null);

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt:desc");
  const [viewMode, setViewMode] = useLocalStorage("vaultfs_view_mode", "grid");
  const [gridSize, setGridSize] = useLocalStorage("vaultfs_grid_size", "md");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastSelectedId, setLastSelectedId] = useState(null);
  const [focusedFileId, setFocusedFileId] = useState(null);
  
  const [labelFilter, setLabelFilter] = useState(null);
  const [organizerView, setOrganizerView] = useState("all");
  const [previewFile, setPreviewFile] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showBulkTag, setShowBulkTag] = useState(false);
  const [showBulkRename, setShowBulkRename] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [stats, setStats] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [showJumpTop, setShowJumpTop] = useState(false);

  const dragCounter = useRef(0);
  const searchInputRef = useRef(null);

  const organizer = useFileOrganizer(user?._id, files);
  const smartFolders = useSmartFolders(organizer.filesWithMeta);

  // Map grid size string to px width
  const gridMinWidth = gridSize === "sm" ? 140 : gridSize === "lg" ? 260 : 190;

  // ── Fetch files + stats ─────────────────────────────────────────────────
  const fetchFiles = useCallback(async (nextPage = 1) => {
    setLoading(true);
    try {
      const [sortField, sortOrder] = sortBy.split(":");
      const sortParam = sortOrder === "desc" ? `-${sortField}` : sortField;

      const [filesRes, statsRes] = await Promise.all([
        api.get("/api/files", { params: { page: nextPage, limit: 40, sort: sortParam } }),
        nextPage === 1 ? api.get("/api/files/stats").catch(() => null) : Promise.resolve(null),
      ]);

      setFiles((prev) => {
        if (nextPage === 1) return filesRes.data.files;
        const seen = new Set(prev.map((f) => f._id));
        return [...prev, ...filesRes.data.files.filter((f) => !seen.has(f._id))];
      });
      setPagination(filesRes.data.pagination || {});
      if (statsRes) setStats(statsRes.data);
      setLastUpdated(new Date());
    } catch {
      toast.error("Failed to load files.");
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    if (location.pathname === "/dashboard") fetchFiles(1);
  }, [location.pathname, fetchFiles]);

  useEffect(() => {
    setPage(1);
    fetchFiles(1);
  }, [fetchFiles]);

  // Auto-refresh when tab becomes visible
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") fetchFiles(1);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [fetchFiles]);

  // ── Real-time socket updates ─────────────────────────────────────────────
  useEffect(() => {
    const handler = () => fetchFiles(1);
    const { on: sOn, off: sOff } = socketRef.current;
    sOn("activity", handler);
    return () => sOff("activity", handler);
  }, [fetchFiles]);

  // ── Jump-to-top scroll detection ─────────────────────────────────────────
  useEffect(() => {
    const el = fileListContainerRef.current?.firstElementChild;
    if (!el) return;
    const handler = () => setShowJumpTop(el.scrollTop > 300);
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [loading, viewMode]);

  const jumpToTop = () => {
    const el = fileListContainerRef.current?.firstElementChild;
    if (el) el.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Right-click context menu close handlers ──────────────────────────────
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    document.addEventListener("contextmenu", close);
    document.addEventListener("scroll", close, true);
    const keyHandler = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("contextmenu", close);
      document.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", keyHandler);
    };
  }, [contextMenu]);

  // ── Drag-and-drop upload ─────────────────────────────────────────────────
  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault();
      if (!e.dataTransfer?.types?.includes("Files")) return;
      dragCounter.current++;
      if (dragCounter.current === 1) setIsDragging(true);
    };
    const handleDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const handleDragLeave = (e) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current <= 0) { dragCounter.current = 0; setIsDragging(false); }
    };
    const handleDrop = async (e) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);
      const droppedFiles = Array.from(e.dataTransfer?.files || []);
      if (!droppedFiles.length) return;
      const t = toast.loading(`Uploading ${droppedFiles.length} file(s)...`);
      try {
        const formData = new FormData();
        droppedFiles.forEach((f) => formData.append("files", f));
        const { data } = await api.post("/api/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        toast.dismiss(t);
        toast.success(`${data.files?.length || 0} file(s) uploaded!`);
        refreshUser();
        fetchFiles(1);
      } catch (err) {
        toast.dismiss(t);
        toast.error(err.response?.data?.message || "Upload failed.");
      }
    };

    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [fetchFiles, refreshUser]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const filesAfterLabel = labelFilter
    ? smartFolders.filteredFiles.filter((file) => file.labels?.some((l) => l.name === labelFilter))
    : smartFolders.filteredFiles;

  const filesAfterOrganizerView = useMemo(() => {
    if (organizerView === "recent") {
      const recentSet = new Set(organizer.recentIds);
      return filesAfterLabel.filter((f) => recentSet.has(f._id));
    }
    if (organizerView === "aliases") return filesAfterLabel.filter((f) => f.organizer?.aliases?.length > 0);
    if (organizerView === "relationships") return filesAfterLabel.filter((f) => f.organizer?.relationships?.length > 0);
    if (organizerView === "colored") return filesAfterLabel.filter((f) => !!f.organizer?.color);
    return filesAfterLabel;
  }, [filesAfterLabel, organizer.recentIds, organizerView]);

  const filteredFiles = search
    ? filesAfterOrganizerView.filter((file) => {
        const q = search.toLowerCase();
        return (
          file.originalName?.toLowerCase().includes(q) ||
          file.tags?.some((t) => t.toLowerCase().includes(q)) ||
          file.organizer?.aliases?.some((a) => a.toLowerCase().includes(q))
        );
      })
    : filesAfterOrganizerView;

  const selectedFiles = filteredFiles.filter((f) => selectedIds.has(f._id));
  const canDiff = selectedFiles.length === 2;

  // Filter chips
  const activeFilters = [];
  if (search) activeFilters.push({ label: `Search: "${search}"`, onRemove: () => setSearch("") });
  if (smartFolders.activeFolder) activeFilters.push({ label: `Folder: ${smartFolders.activeFolder.name}`, onRemove: () => smartFolders.setActiveId(null) });
  if (labelFilter) activeFilters.push({ label: `Label: ${labelFilter}`, onRemove: () => setLabelFilter(null) });
  if (organizerView !== "all") activeFilters.push({ label: `View: ${ORGANIZER_VIEWS.find((v) => v.id === organizerView)?.label || organizerView}`, onRemove: () => setOrganizerView("all") });

  // Storage donut (MISSING PIECE RESTORED)
  const storageDonut = useMemo(() => {
    if (!stats?.byMimeType) return [];
    const groups = {};
    Object.entries(stats.byMimeType).forEach(([mime, count]) => {
      const cat = groupMime(mime);
      groups[cat] = (groups[cat] || 0) + count;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value, color: MIME_GROUPS[name] || "#71717a" }))
      .sort((a, b) => b.value - a.value);
  }, [stats]);

  // ── Keyboard Navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (event) => {
      const target = event.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      
      if (event.key === "f" || event.key === "F") { event.preventDefault(); searchInputRef.current?.focus(); return; }
      if (event.key === "g" || event.key === "G") { setViewMode("grid"); return; }
      if (event.key === "l" || event.key === "L") { setViewMode("list"); return; }

      // Arrow key navigation
      if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        
        // Calculate columns based on view
        const cols = viewMode === "grid" 
          ? Math.max(1, Math.floor((window.innerWidth - 350) / gridMinWidth)) 
          : 1;

        let currentIndex = filteredFiles.findIndex(f => f._id === focusedFileId);
        if (currentIndex === -1) currentIndex = 0; // Default to first if none focused

        let nextIndex = currentIndex;

        if (event.key === "ArrowRight") nextIndex = Math.min(currentIndex + 1, filteredFiles.length - 1);
        if (event.key === "ArrowLeft") nextIndex = Math.max(currentIndex - 1, 0);
        if (event.key === "ArrowDown") nextIndex = Math.min(currentIndex + cols, filteredFiles.length - 1);
        if (event.key === "ArrowUp") nextIndex = Math.max(currentIndex - cols, 0);

        if (nextIndex !== currentIndex || !focusedFileId) {
          const nextFile = filteredFiles[nextIndex];
          if (nextFile) {
            setFocusedFileId(nextFile._id);
            // Scroll into view
            const el = document.getElementById(`file-${nextFile._id}`);
            if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }
        }
      }

      // Space or Enter
      if (event.key === " " || event.key === "Enter") {
        if (!focusedFileId) return;
        event.preventDefault();
        
        const file = filteredFiles.find(f => f._id === focusedFileId);
        if (!file) return;

        if (event.key === " ") {
          if (!selectMode) setSelectMode(true);
          toggleSelect(file._id, { shiftKey: event.shiftKey });
        } else if (event.key === "Enter") {
          handleOpenPreview(file);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filteredFiles, viewMode, gridMinWidth, focusedFileId, selectMode]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const toggleSelect = (id, event) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      
      // Shift+Click range selection
      if (event?.shiftKey && lastSelectedId) {
        const currentIndex = filteredFiles.findIndex(f => f._id === id);
        const lastIndex = filteredFiles.findIndex(f => f._id === lastSelectedId);
        
        if (currentIndex !== -1 && lastIndex !== -1) {
          const start = Math.min(currentIndex, lastIndex);
          const end = Math.max(currentIndex, lastIndex);
          
          for (let i = start; i <= end; i++) {
            next.add(filteredFiles[i]._id);
          }
          return next;
        }
      }

      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setLastSelectedId(id);
  };

  const selectAll = () => setSelectedIds(new Set(filteredFiles.map((f) => f._id)));
  const clearSelect = () => { setSelectedIds(new Set()); setSelectMode(false); setLastSelectedId(null); };

  const handleOpenPreview = (file) => {
    organizer.markRecent(file);
    setPreviewFile(file);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    try {
      await api.post("/api/files/bulk-delete", { ids: [...selectedIds] });
      toast.success(`${selectedIds.size} file(s) deleted.`);
      clearSelect();
      fetchFiles(1);
      refreshUser();
    } catch {
      toast.error("Bulk delete failed.");
    }
  };

  const handleBulkDownload = async () => {
    if (!selectedIds.size) return;
    try {
      const { data } = await api.post("/api/files/bulk-download", { ids: [...selectedIds] }, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url; link.download = "files.zip"; link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed.");
    }
  };

  const handleDelete = (fileId) => {
    const deletedFile = files.find((f) => f._id === fileId);
    setFiles((prev) => prev.filter((f) => f._id !== fileId));
    refreshUser();
    if (!deletedFile) return;
    pushAction({
      undoLabel: "File restored.",
      redoLabel: "File deleted again.",
      undo: async () => {
        await api.post(`/api/files/${fileId}/restore`);
        setFiles((prev) => [deletedFile, ...prev]);
        refreshUser();
      },
      redo: async () => {
        await api.delete(`/api/files/${fileId}`);
        setFiles((prev) => prev.filter((f) => f._id !== fileId));
        refreshUser();
      },
    });
  };

  const handleStar = (fileId, nextStarred) => {
    setFiles((prev) => prev.map((f) => (f._id === fileId ? { ...f, isStarred: nextStarred } : f)));
    pushAction({
      undoLabel: nextStarred ? "Star removed." : "Star restored.",
      redoLabel: nextStarred ? "Star restored." : "Star removed again.",
      undo: async () => {
        if (nextStarred) await api.delete(`/api/files/${fileId}/star`);
        else await api.post(`/api/files/${fileId}/star`);
        setFiles((prev) => prev.map((f) => (f._id === fileId ? { ...f, isStarred: !nextStarred } : f)));
      },
      redo: async () => {
        if (nextStarred) await api.post(`/api/files/${fileId}/star`);
        else await api.delete(`/api/files/${fileId}/star`);
        setFiles((prev) => prev.map((f) => (f._id === fileId ? { ...f, isStarred: nextStarred } : f)));
      },
    });
  };

  const handleQuickShare = async (file) => {
    try {
      const { data } = await api.post(`/api/files/${file._id}/share`, { expiresIn: 24 * 3600 });
      const url = data.url || `${window.location.origin}/s/${data.token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied! Expires in 24h.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Share failed.");
    }
  };

  const handleDownload = async (file) => {
    try {
      const { data } = await api.get(`/api/files/${file._id}/signed-url?inline=0`);
      const response = await fetch(data.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = file.originalName; link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed.");
    }
  };

  const handleRenameCommit = async (fileId, newName) => {
    const file = files.find((f) => f._id === fileId);
    if (!newName?.trim() || newName.trim() === file?.originalName) {
      setRenamingId(null); return;
    }
    try {
      await api.put(`/api/files/${fileId}`, { originalName: newName.trim() });
      toast.success("Renamed.");
      setFiles((prev) => prev.map((f) => (f._id === fileId ? { ...f, originalName: newName.trim() } : f)));
    } catch {
      toast.error("Rename failed.");
    } finally {
      setRenamingId(null);
    }
  };

  const handleContextMenu = (e, file) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (e?._rename) {
      setRenamingId(file._id);
      setViewMode("list");
      return;
    }
    setContextMenu({ x: e.clientX ?? 100, y: e.clientY ?? 100, file });
  };

  const loadMore = useCallback(() => {
    if (loading) return;
    if (!pagination.pages || page >= pagination.pages) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFiles(nextPage);
  }, [fetchFiles, loading, page, pagination.pages]);

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Sort";

  const emptyState = (
    <div className="card p-20 text-center animate-fade-up">
      <div className="w-16 h-16 rounded-2xl bg-surface-3 border border-surface-4 flex items-center justify-center mx-auto mb-4">
        <FolderOpen size={28} className="text-gray-600" />
      </div>
      <p className="text-gray-400 font-display font-semibold text-lg mb-1">
        {files.length === 0 ? "No files yet" : "No matching files"}
      </p>
      <p className="text-gray-600 text-sm mb-5">
        {files.length === 0 ? "Drop files anywhere on this page, or use the upload button." : search ? "Try a different search." : "This view has no matching files."}
      </p>
      {files.length === 0 && (
        <button onClick={() => { window.location.href = "/upload"; }} className="btn-primary px-5 py-2.5 mx-auto">
          <Upload size={14} /> Upload Files
        </button>
      )}
    </div>
  );

  return (
    <div className="flex h-full relative">
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-[45] bg-brand/10 backdrop-blur-sm border-4 border-dashed border-brand flex items-center justify-center pointer-events-none">
          <div className="bg-surface-1 border border-brand/40 rounded-2xl px-8 py-6 shadow-2xl flex flex-col items-center">
            <UploadCloud size={48} className="text-brand-glow mb-3 animate-pulse" />
            <p className="text-white font-display font-bold text-lg">Drop files to upload</p>
            <p className="text-gray-500 text-xs mt-1">Release to add them to your vault</p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="hidden xl:flex flex-col w-52 border-r border-surface-3 bg-surface-1 p-4 space-y-2 overflow-y-auto flex-shrink-0">
        <SmartFolderSidebar
          folders={smartFolders.folders}
          activeId={smartFolders.activeId}
          onSelect={smartFolders.setActiveId}
          getCount={smartFolders.getCount}
          onDelete={smartFolders.deleteFolder}
          showCreate={() => setShowSmartModal(true)}
        />

        {storageDonut.length > 0 && (
          <div className="pt-2 mt-2 border-t border-surface-3">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-2 mb-2">Files by Type</p>
            <div className="relative h-24 mb-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={storageDonut} dataKey="value" innerRadius={26} outerRadius={44} paddingAngle={2} stroke="none">
                    {storageDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-0.5">
              {storageDonut.slice(0, 5).map((d) => (
                <div key={d.name} className="flex items-center justify-between text-[10px] px-2">
                  <span className="flex items-center gap-1.5 truncate">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-gray-400 truncate">{d.name}</span>
                  </span>
                  <span className="text-gray-600 font-mono flex-shrink-0">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 p-6 space-y-4 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-xl text-white">
              {smartFolders.activeFolder ? smartFolders.activeFolder.name : "My Files"}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
              {user?.storageUsed ? ` · ${formatBytes(user.storageUsed)} used` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowSearch(true)} className="btn-ghost text-sm px-3 py-2 flex items-center gap-1.5">
              <Search size={13} /> Search
            </button>
            <button onClick={() => fetchFiles(1)} className="btn-ghost px-3 py-2" title="Refresh">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>

            <div className="relative">
              <button onClick={() => setShowSortMenu((v) => !v)} className="btn-ghost text-sm px-3 py-2 flex items-center gap-1.5">
                <SlidersHorizontal size={13} /> {currentSortLabel} <ChevronDown size={11} />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-surface-1 border border-surface-4 rounded-xl shadow-2xl z-20 overflow-hidden animate-fade-up">
                  {SORT_OPTIONS.map((option) => (
                    <button key={option.value}
                      onClick={() => { setSortBy(option.value); setShowSortMenu(false); }}
                      className={`w-full px-4 py-2.5 text-xs text-left transition-colors ${sortBy === option.value ? "bg-brand/10 text-brand-glow" : "text-gray-400 hover:bg-surface-3 hover:text-white"}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex bg-surface-2 border border-surface-4 rounded-lg p-0.5">
              {[{ id: "grid", icon: Grid3X3 }, { id: "list", icon: List }].map(({ id, icon: Icon }) => (
                <button key={id} onClick={() => setViewMode(id)}
                  className={`p-2 rounded-md transition-all ${viewMode === id ? "bg-surface-1 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"}`}>
                  <Icon size={13} />
                </button>
              ))}
            </div>

            {/* Grid Size Dropdown */}
            {viewMode === "grid" && (
              <div className="relative group">
                <button className="btn-ghost px-2.5 py-2 flex items-center gap-1">
                  <Maximize2 size={13} /> <span className="text-xs">{gridSize.toUpperCase()}</span>
                </button>
                <div className="absolute right-0 top-full mt-1 w-28 bg-surface-1 border border-surface-4 rounded-xl shadow-2xl z-20 overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all">
                  {["sm", "md", "lg"].map((sz) => (
                    <button key={sz} onClick={() => setGridSize(sz)}
                      className={`w-full px-3 py-2 text-xs text-left transition-colors ${gridSize === sz ? "bg-brand/10 text-brand-glow" : "text-gray-400 hover:bg-surface-3 hover:text-white"}`}>
                      {sz === "sm" ? "Small" : sz === "lg" ? "Large" : "Medium"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={() => setSelectMode((v) => !v)}
              className={`btn-ghost text-sm px-3 py-2 flex items-center gap-1.5 ${selectMode ? "bg-brand/10 text-brand-glow border-brand/20" : ""}`}>
              <CheckSquare size={13} /> {selectMode ? "Cancel" : "Select"}
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="card p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Files</p>
              <p className="text-lg font-mono font-bold text-white mt-0.5">{(stats.totalFiles || 0).toLocaleString()}</p>
            </div>
            <div className="card p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Storage</p>
                <p className="text-[10px] text-brand-glow font-mono">{stats.storagePercent || 0}%</p>
              </div>
              <p className="text-[11px] font-mono text-white mb-1.5 truncate">
                {formatBytes(stats.storageUsed)} / {formatBytes(stats.storageLimit)}
              </p>
              <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (stats.storagePercent || 0) > 85 ? "bg-accent-red"
                    : (stats.storagePercent || 0) > 70 ? "bg-accent-amber"
                    : "bg-brand"
                  }`}
                  style={{ width: `${Math.min(stats.storagePercent || 0, 100)}%` }}
                />
              </div>
            </div>
            <div className="card p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Uploaded Today</p>
              <p className="text-lg font-mono font-bold text-white mt-0.5">{(stats.uploadedToday || 0).toLocaleString()}</p>
            </div>
            <div className="card p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Last Updated</p>
              <p className="text-xs font-mono text-gray-300 mt-0.5">{lastUpdated ? timeAgo(lastUpdated) : "—"}</p>
              <button onClick={() => fetchFiles(1)} disabled={loading} className="text-[10px] text-brand-glow hover:underline mt-1 flex items-center gap-1">
                <RefreshCw size={9} className={loading ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            ref={searchInputRef}
            className="input pl-8 text-sm"
            placeholder={`Filter ${smartFolders.activeFolder ? smartFolders.activeFolder.name : "files"}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeFilters.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-brand/10 border border-brand/20 text-brand-glow">
                {f.label}
                <button onClick={f.onRemove} className="opacity-60 hover:opacity-100"><X size={10} /></button>
              </span>
            ))}
            <button onClick={() => { setSearch(""); setLabelFilter(null); setOrganizerView("all"); smartFolders.setActiveId(null); }}
              className="text-xs text-gray-600 hover:text-accent-red px-2 transition-colors">
              Clear all
            </button>
          </div>
        )}

        <LabelFilterBar files={files} activeLabel={labelFilter} onChange={setLabelFilter} />

        {/* Organizer views */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {ORGANIZER_VIEWS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setOrganizerView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all whitespace-nowrap ${
                organizerView === id ? "bg-brand/10 text-brand-glow border-brand/20" : "text-gray-500 border-surface-4 hover:text-white"
              }`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* File list */}
        <div ref={fileListContainerRef} className="flex-1 min-h-0 overflow-hidden">
          {loading && files.length === 0 ? (
            <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" : "space-y-2"}>
              {[...Array(12)].map((_, i) => (
                <div key={i} className={`skeleton rounded-xl ${viewMode === "grid" ? "aspect-video" : "h-16"}`} />
              ))}
            </div>
          ) : (
            <VirtualFileBrowser
              items={filteredFiles}
              viewMode={viewMode}
              loading={loading}
              gridMinWidth={gridMinWidth}
              hasMore={page < (pagination.pages || 1)}
              onLoadMore={loadMore}
              emptyState={emptyState}
              renderItem={(file) => (
                <div id={`file-${file._id}`} key={file._id}>
                  {viewMode === "grid" ? (
                    <FileCard
                      file={file}
                      isSelected={selectedIds.has(file._id)}
                      selectMode={selectMode}
                      isFocused={focusedFileId === file._id}
                      onToggle={toggleSelect}
                      onOpen={handleOpenPreview}
                      onStar={handleStar}
                      onQuickShare={handleQuickShare}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                      onContextMenu={handleContextMenu}
                    />
                  ) : (
                    <FileRow
                      file={file}
                      isSelected={selectedIds.has(file._id)}
                      selectMode={selectMode}
                      isFocused={focusedFileId === file._id}
                      onToggle={toggleSelect}
                      onOpen={handleOpenPreview}
                      onStar={handleStar}
                      onQuickShare={handleQuickShare}
                      onDownload={handleDownload}
                      onDelete={handleDelete}
                      onContextMenu={handleContextMenu}
                      isRenaming={renamingId === file._id}
                      onRenameCommit={handleRenameCommit}
                      onRenameCancel={() => setRenamingId(null)}
                    />
                  )}
                </div>
              )}
            />
          )}
        </div>
      </div>

      {/* Floating bulk action bar */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-fade-up">
          <div className="bg-surface-1 border border-surface-4 rounded-2xl shadow-2xl px-4 py-2.5 flex items-center gap-2 backdrop-blur-md">
            <span className="text-sm font-semibold text-white">{selectedIds.size} selected</span>
            <div className="w-px h-5 bg-surface-4" />
            <button onClick={selectAll} className="btn-ghost text-xs px-2 py-1.5">All</button>
            <button onClick={handleBulkDownload} className="btn-ghost text-xs px-2 py-1.5 flex items-center gap-1">
              <Download size={12} /> Download
            </button>
            <button onClick={() => setShowBulkTag(true)} className="btn-ghost text-xs px-2 py-1.5 flex items-center gap-1">
              <Tag size={12} /> Tag
            </button>
            <button onClick={() => setShowBulkRename(true)} className="btn-ghost text-xs px-2 py-1.5 flex items-center gap-1">
              <Edit3 size={12} /> Rename
            </button>
            {canDiff && (
              <button onClick={() => setShowDiff(true)} className="btn-ghost text-xs px-2 py-1.5 flex items-center gap-1 text-brand-glow">
                <GitCompare size={12} /> Compare
              </button>
            )}
            <button onClick={handleBulkDelete}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-red-900/15 border border-red-900/30 text-accent-red hover:bg-red-900/30">
              <Trash2 size={12} /> Delete
            </button>
            <button onClick={clearSelect} className="btn-ghost text-xs px-2 py-1.5">
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Jump to top */}
      {showJumpTop && (
        <button onClick={jumpToTop}
          className="fixed bottom-24 right-6 z-30 w-10 h-10 rounded-full bg-surface-1 border border-surface-4 text-gray-400 hover:text-white shadow-lg transition-all hover:scale-110 flex items-center justify-center"
          title="Jump to top">
          <ChevronUpIcon size={18} />
        </button>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
          <div
            className="fixed z-[56] bg-surface-1 border border-surface-4 rounded-xl shadow-2xl py-1.5 w-56 animate-fade-up"
            style={{
              left: Math.min(contextMenu.x, window.innerWidth - 240),
              top: Math.min(contextMenu.y, window.innerHeight - 380),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-1.5 border-b border-surface-3 mb-1">
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">File</p>
              <p className="text-xs text-gray-300 truncate">{contextMenu.file.originalName}</p>
            </div>
            <button onClick={() => { handleOpenPreview(contextMenu.file); setContextMenu(null); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-surface-2 flex items-center gap-2">
              <FolderOpen size={12} /> Open preview
            </button>
            <button onClick={() => { handleStar(contextMenu.file._id, !contextMenu.file.isStarred); setContextMenu(null); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-surface-2 flex items-center gap-2">
              <Star size={12} /> {contextMenu.file.isStarred ? "Unstar" : "Star"}
            </button>
            <button onClick={() => { setRenamingId(contextMenu.file._id); setViewMode("list"); setContextMenu(null); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-surface-2 flex items-center gap-2">
              <Edit3 size={12} /> Rename
            </button>
            <button onClick={() => { handleQuickShare(contextMenu.file); setContextMenu(null); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-surface-2 flex items-center gap-2">
              <Link2 size={12} /> Copy share link
            </button>
            <button onClick={() => { handleDownload(contextMenu.file); setContextMenu(null); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-surface-2 flex items-center gap-2">
              <Download size={12} /> Download
            </button>
            <button onClick={() => { navigator.clipboard.writeText(contextMenu.file._id); toast.success("File ID copied"); setContextMenu(null); }}
              className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-surface-2 flex items-center gap-2">
              <Copy size={12} /> Copy file ID
            </button>
            <div className="border-t border-surface-3 my-1" />
            <button onClick={() => { handleDelete(contextMenu.file._id); setContextMenu(null); }}
              className="w-full text-left px-3 py-2 text-xs text-accent-red hover:bg-red-900/10 flex items-center gap-2">
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </>
      )}

      {/* Modals */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          files={filteredFiles}
          onClose={() => setPreviewFile(null)}
          onDelete={handleDelete}
          onStar={handleStar}
          onRefresh={() => fetchFiles(1)}
          organizerMeta={organizer.getMeta(previewFile._id)}
          onOrganizerUpdate={(updates) => organizer.updateMeta(previewFile._id, updates)}
          isOwner={previewFile.owner === user?._id || previewFile.owner?.toString() === user?._id}
        />
      )}

      {showSearch && (
        <AdvancedSearch
          onClose={() => setShowSearch(false)}
          onFileClick={(file) => { organizer.markRecent(file); setPreviewFile(file); setShowSearch(false); }}
        />
      )}

      {showBulkTag && (
        <BulkTagEditor selectedIds={[...selectedIds]} onComplete={() => fetchFiles(1)} onClose={() => setShowBulkTag(false)} />
      )}

      {showBulkRename && (
        <BulkRenameModal selectedFiles={selectedFiles} onComplete={() => { fetchFiles(1); clearSelect(); }} onClose={() => setShowBulkRename(false)} />
      )}

      {showDiff && selectedFiles.length === 2 && (
        <FileDiffViewer
          fileA={{ url: `/api/files/download/${selectedFiles[0]._id}`, name: selectedFiles[0].originalName }}
          fileB={{ url: `/api/files/download/${selectedFiles[1]._id}`, name: selectedFiles[1].originalName }}
          onClose={() => setShowDiff(false)}
        />
      )}

      {showSmartModal && (
        <CreateSmartFolderModal
          onClose={() => setShowSmartModal(false)}
          onCreate={(folder) => { smartFolders.createFolder(folder); setShowSmartModal(false); }}
        />
      )}
    </div>
  );
}
