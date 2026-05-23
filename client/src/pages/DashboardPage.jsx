import { useState, useEffect, useCallback } from "react";
import {
  Grid3X3, List, Star, Download, Trash2, Share2, Tag,
  Search, RefreshCw, CheckSquare, Square, X, ChevronDown,
  Upload, FileText, Filter, GitCompare, Zap, FolderOpen,
  SlidersHorizontal, Eye, Plus,
} from "lucide-react";
import api from "../utils/api";
import { useAuth }         from "../context/AuthContext";
import { formatBytes, formatDate, getFileIcon, truncate } from "../utils/helpers";
import toast from "react-hot-toast";
import FilePreviewModal    from "../components/FilePreviewModal";
import AdvancedSearch      from "../components/AdvancedSearch";
import BulkTagEditor       from "../components/BulkTagEditor";
import FileDiffViewer      from "../components/FileDiffViewer";
import { LabelDot, LabelFilterBar } from "../components/FileLabels";
import { useSmartFolders, SmartFolderSidebar, CreateSmartFolderModal } from "../components/SmartFolders";

// ── File Card (grid view) ─────────────────────────────────────────────────────
function FileCard({ file, isSelected, selectMode, onToggle, onClick }) {
  const hasThumbnail = file.thumbnailUrl || (file.mimetype?.startsWith("image/") && file.url);

  return (
    <div
      onClick={() => selectMode ? onToggle(file._id) : onClick(file)}
      className={`card group cursor-pointer overflow-hidden transition-all duration-150 hover:border-surface-5 ${
        isSelected ? "border-brand/50 bg-brand/5" : ""
      }`}
    >
      {/* Thumbnail / icon */}
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

        {/* Select overlay */}
        {selectMode && (
          <div className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}>
            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
              isSelected ? "bg-brand border-brand" : "border-white/70"
            }`}>
              {isSelected && <CheckSquare size={16} className="text-white" />}
            </div>
          </div>
        )}

        {/* Star badge */}
        {file.isStarred && (
          <div className="absolute top-2 right-2">
            <Star size={12} className="text-yellow-400 fill-yellow-400 drop-shadow-sm" />
          </div>
        )}

        {/* Labels */}
        {file.labels?.length > 0 && (
          <div className="absolute bottom-2 left-2">
            <LabelDot labels={file.labels} size={7} maxShow={3} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-medium text-gray-200 truncate" title={file.originalName}>
          {truncate(file.originalName, 28)}
        </p>
        <p className="text-[10px] text-gray-600 font-mono mt-0.5">{formatBytes(file.size)}</p>
      </div>
    </div>
  );
}

// ── File Row (list view) ──────────────────────────────────────────────────────
function FileRow({ file, isSelected, selectMode, onToggle, onClick }) {
  return (
    <div
      onClick={() => selectMode ? onToggle(file._id) : onClick(file)}
      className={`card p-3 flex items-center gap-3 group cursor-pointer hover:border-surface-5 transition-all duration-150 ${
        isSelected ? "border-brand/50 bg-brand/5" : ""
      }`}
    >
      {selectMode && (
        <button onClick={(e) => { e.stopPropagation(); onToggle(file._id); }} className="flex-shrink-0">
          {isSelected
            ? <CheckSquare size={15} className="text-brand-glow" />
            : <Square size={15} className="text-gray-600" />
          }
        </button>
      )}

      <span className="text-xl flex-shrink-0">{getFileIcon(file.mimetype)}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-200 truncate" title={file.originalName}>
            {truncate(file.originalName, 50)}
          </p>
          {file.isStarred && <Star size={10} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
          <LabelDot labels={file.labels} size={7} maxShow={3} />
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-[11px] text-gray-600 font-mono">{formatBytes(file.size)}</span>
          <span className="text-[11px] text-gray-600">{formatDate(file.createdAt)}</span>
          {file.tags?.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] text-gray-700 font-mono">#{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sort options ──────────────────────────────────────────────────────────────
const SORT_OPTIONS = [
  { label: "Newest first", value: "createdAt:desc"   },
  { label: "Oldest first", value: "createdAt:asc"    },
  { label: "Largest",      value: "size:desc"        },
  { label: "Smallest",     value: "size:asc"         },
  { label: "Name A–Z",     value: "originalName:asc" },
  { label: "Name Z–A",     value: "originalName:desc"},
];

// ─────────────────────────────────────────────────────────────────────────────
//  Main Dashboard Page
// ─────────────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const [files,       setFiles]      = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [page,        setPage]       = useState(1);
  const [pagination,  setPagination] = useState({});
  const [search,      setSearch]     = useState("");
  const [sortBy,      setSortBy]     = useState("createdAt:desc");
  const [viewMode,    setViewMode]   = useState("grid");   // grid | list
  const [selectMode,  setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [labelFilter, setLabelFilter] = useState(null);

  // Modals
  const [previewFile,    setPreviewFile]    = useState(null);
  const [showSearch,     setShowSearch]     = useState(false);
  const [showBulkTag,    setShowBulkTag]    = useState(false);
  const [showDiff,       setShowDiff]       = useState(false);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [showSortMenu,   setShowSortMenu]   = useState(false);

  // Smart folders
  const sf = useSmartFolders(files);
  const displayFiles = labelFilter
    ? sf.filteredFiles.filter((f) => f.labels?.some((l) => l.name === labelFilter))
    : sf.filteredFiles;

  const fetchFiles = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const [sortField, sortOrder] = sortBy.split(":");
      const sortParam = sortOrder === "desc" ? `-${sortField}` : sortField;
      const { data } = await api.get("/api/files", {
        params: { page: pg, limit: 40, sort: sortParam },
      });
      if (pg === 1) {
        setFiles(data.files);
      } else {
        setFiles((prev) => [...prev, ...data.files]);
      }
      setPagination(data.pagination || {});
    } catch { toast.error("Failed to load files."); }
    finally { setLoading(false); }
  }, [sortBy]);

  useEffect(() => { setPage(1); fetchFiles(1); }, [fetchFiles]);

  // Search filter (client-side quick filter)
  const filteredBySearch = search
    ? displayFiles.filter((f) =>
        f.originalName?.toLowerCase().includes(search.toLowerCase()) ||
        f.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : displayFiles;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll  = () => setSelectedIds(new Set(filteredBySearch.map((f) => f._id)));
  const clearSelect = () => { setSelectedIds(new Set()); setSelectMode(false); };

  // ✅ FIXED: removed confirm() popup
  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    try {
      await api.post("/api/files/bulk-delete", { ids: [...selectedIds] });
      toast.success(`${selectedIds.size} file(s) deleted.`);
      clearSelect();
      fetchFiles(1);
      refreshUser();
    } catch { toast.error("Bulk delete failed."); }
  };

  const handleBulkDownload = async () => {
    if (!selectedIds.size) return;
    try {
      const { data } = await api.post("/api/files/bulk-download", { ids: [...selectedIds] }, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const a   = document.createElement("a");
      a.href = url; a.download = "files.zip"; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed."); }
  };

  // Diff viewer — need exactly 2 text files selected
  const selectedFiles = filteredBySearch.filter((f) => selectedIds.has(f._id));
  const canDiff = selectedFiles.length === 2;

  const handleDelete = (fileId) => {
    setFiles((prev) => prev.filter((f) => f._id !== fileId));
    refreshUser();
  };

  const handleStar = (fileId) => {
    setFiles((prev) => prev.map((f) =>
      f._id === fileId ? { ...f, isStarred: !f.isStarred } : f
    ));
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || "Sort";

  return (
    <div className="flex h-full">
      {/* ── Smart Folder Sidebar ─────────────────────────────────────────── */}
      <aside className="hidden xl:flex flex-col w-52 border-r border-surface-3 bg-surface-1 p-4 space-y-2 overflow-y-auto flex-shrink-0">
        <SmartFolderSidebar
          folders={sf.folders}
          activeId={sf.activeId}
          onSelect={sf.setActiveId}
          getCount={sf.getCount}
          onDelete={sf.deleteFolder}
          showCreate={() => setShowSmartModal(true)}
        />
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 p-6 space-y-4 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display font-bold text-xl text-white">
              {sf.activeFolder ? sf.activeFolder.name : "My Files"}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {filteredBySearch.length} file{filteredBySearch.length !== 1 ? "s" : ""}
              {user?.storageUsed ? ` · ${formatBytes(user.storageUsed)} used` : ""}
            </p>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowSearch(true)} className="btn-ghost text-sm px-3 py-2 flex items-center gap-1.5">
              <Search size={13} /> Search
            </button>
            <button onClick={() => fetchFiles(1)} className="btn-ghost px-3 py-2">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>

            {/* Sort dropdown */}
            <div className="relative">
              <button onClick={() => setShowSortMenu(!showSortMenu)} className="btn-ghost text-sm px-3 py-2 flex items-center gap-1.5">
                <SlidersHorizontal size={13} /> {currentSortLabel} <ChevronDown size={11} />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-surface-1 border border-surface-4 rounded-xl shadow-2xl z-20 overflow-hidden animate-fade-up">
                  {SORT_OPTIONS.map((o) => (
                    <button key={o.value} onClick={() => { setSortBy(o.value); setShowSortMenu(false); }}
                      className={`w-full px-4 py-2.5 text-xs text-left transition-colors ${sortBy === o.value ? "bg-brand/10 text-brand-glow" : "text-gray-400 hover:bg-surface-3 hover:text-white"}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View toggle */}
            <div className="flex bg-surface-2 border border-surface-4 rounded-lg p-0.5">
              {[{ id: "grid", icon: Grid3X3 }, { id: "list", icon: List }].map(({ id, icon: Icon }) => (
                <button key={id} onClick={() => setViewMode(id)}
                  className={`p-2 rounded-md transition-all ${viewMode === id ? "bg-surface-1 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"}`}>
                  <Icon size={13} />
                </button>
              ))}
            </div>

            {/* Select mode toggle */}
            <button onClick={() => setSelectMode(!selectMode)} className={`btn-ghost text-sm px-3 py-2 flex items-center gap-1.5 ${selectMode ? "bg-brand/10 text-brand-glow border-brand/20" : ""}`}>
              <CheckSquare size={13} /> {selectMode ? "Cancel" : "Select"}
            </button>
          </div>
        </div>

        {/* Quick search bar */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input pl-8 text-sm"
            placeholder={`Filter ${sf.activeFolder ? sf.activeFolder.name : "files"}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Label filter bar */}
        <LabelFilterBar files={files} activeLabel={labelFilter} onChange={setLabelFilter} />

        {/* Select mode toolbar */}
        {selectMode && (
          <div className="flex items-center gap-2 flex-wrap p-3 bg-brand/5 border border-brand/15 rounded-xl animate-fade-up">
            <span className="text-xs font-medium text-gray-300">{selectedIds.size} selected</span>
            <button onClick={selectAll}  className="btn-ghost text-xs px-2.5 py-1.5">All</button>
            <button onClick={clearSelect} className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1"><X size={11} /> Clear</button>

            <div className="flex-1" />

            {selectedIds.size > 0 && (
              <>
                <button onClick={() => setShowBulkTag(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-surface-3 border border-surface-4 text-gray-300 hover:text-white transition-colors">
                  <Tag size={11} /> Tag
                </button>
                <button onClick={handleBulkDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-surface-3 border border-surface-4 text-gray-300 hover:text-white transition-colors">
                  <Download size={11} /> Download
                </button>
                {canDiff && (
                  <button onClick={() => setShowDiff(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand/10 border border-brand/25 text-brand-glow hover:bg-brand/20 transition-colors">
                    <GitCompare size={11} /> Compare
                  </button>
                )}
                <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-900/15 border border-red-900/30 text-accent-red hover:bg-red-900/30 transition-colors">
                  <Trash2 size={11} /> Delete
                </button>
              </>
            )}
          </div>
        )}

        {/* File grid / list */}
        {loading && files.length === 0 ? (
          <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" : "space-y-2"}>
            {[...Array(12)].map((_, i) => (
              <div key={i} className={`skeleton rounded-xl ${viewMode === "grid" ? "aspect-video" : "h-16"}`} />
            ))}
          </div>
        ) : filteredBySearch.length === 0 ? (
          <div className="card p-20 text-center animate-fade-up">
            <div className="w-16 h-16 rounded-2xl bg-surface-3 border border-surface-4 flex items-center justify-center mx-auto mb-4">
              <FolderOpen size={28} className="text-gray-600" />
            </div>
            <p className="text-gray-400 font-display font-semibold text-lg mb-1">
              {files.length === 0 ? "No files yet" : "No matching files"}
            </p>
            <p className="text-gray-600 text-sm mb-5">
              {files.length === 0
                ? "Upload your first file to get started."
                : search ? "Try a different search term." : "This smart folder has no matching files."}
            </p>
            {files.length === 0 && (
              <button onClick={() => window.location.href = "/upload"} className="btn-primary px-5 py-2.5 mx-auto">
                <Upload size={14} /> Upload Files
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredBySearch.map((file) => (
              <FileCard
                key={file._id}
                file={file}
                isSelected={selectedIds.has(file._id)}
                selectMode={selectMode}
                onToggle={toggleSelect}
                onClick={setPreviewFile}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBySearch.map((file) => (
              <FileRow
                key={file._id}
                file={file}
                isSelected={selectedIds.has(file._id)}
                selectMode={selectMode}
                onToggle={toggleSelect}
                onClick={setPreviewFile}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {pagination.pages > 1 && page < pagination.pages && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => { const next = page + 1; setPage(next); fetchFiles(next); }}
              disabled={loading}
              className="btn-ghost text-sm px-6 py-2.5 flex items-center gap-2"
            >
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <ChevronDown size={13} />}
              Load more ({pagination.total - files.length} remaining)
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          files={filteredBySearch}
          onClose={() => setPreviewFile(null)}
          onDelete={handleDelete}
          onStar={handleStar}
          onRefresh={() => fetchFiles(1)}
          isOwner={previewFile.owner === user?._id || previewFile.owner?.toString() === user?._id}
        />
      )}

      {showSearch && (
        <AdvancedSearch
          onClose={() => setShowSearch(false)}
          onFileClick={(file) => { setPreviewFile(file); setShowSearch(false); }}
        />
      )}

      {showBulkTag && (
        <BulkTagEditor
          selectedIds={[...selectedIds]}
          onComplete={() => fetchFiles(1)}
          onClose={() => setShowBulkTag(false)}
        />
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
          onCreate={(folder) => { sf.createFolder(folder); setShowSmartModal(false); }}
        />
      )}
    </div>
  );
}