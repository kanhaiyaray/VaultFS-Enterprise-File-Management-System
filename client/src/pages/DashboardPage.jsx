import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckSquare,
  ChevronDown,
  FolderOpen,
  GitCompare,
  Grid3X3,
  Link2,
  List,
  Palette,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Square,
  Star,
  Tag,
  Trash2,
  Upload,
  X,
  Clock3,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useActionHistory } from "../context/ActionHistoryContext";
import { formatBytes, formatDate, getFileIcon, truncate } from "../utils/helpers";
import FilePreviewModal from "../components/FilePreviewModal";
import AdvancedSearch from "../components/AdvancedSearch";
import BulkTagEditor from "../components/BulkTagEditor";
import FileDiffViewer from "../components/FileDiffViewer";
import { LabelDot, LabelFilterBar } from "../components/FileLabels";
import { CreateSmartFolderModal, SmartFolderSidebar, useSmartFolders } from "../components/SmartFolders";
import VirtualFileBrowser from "../components/VirtualFileBrowser";
import { useFileOrganizer } from "../hooks/useFileOrganizer";

function FileCard({ file, isSelected, selectMode, onToggle, onOpen }) {
  const accentColor = file.organizer?.color;
  const hasThumbnail = file.thumbnailUrl || (file.mimetype?.startsWith("image/") && file.url);

  return (
    <div
      onClick={() => (selectMode ? onToggle(file._id) : onOpen(file))}
      className={`card group cursor-pointer overflow-hidden transition-all duration-150 hover:border-surface-5 ${
        isSelected ? "border-brand/50 bg-brand/5" : ""
      }`}
      style={accentColor ? { boxShadow: `inset 0 0 0 1px ${accentColor}55` } : undefined}
    >
      <div className="aspect-video bg-surface-2 flex items-center justify-center relative overflow-hidden">
        {hasThumbnail ? (
          <img
            src={file.thumbnailUrl || file.url}
            alt={file.originalName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(event) => { event.target.style.display = "none"; }}
          />
        ) : (
          <span className="text-4xl opacity-50">{getFileIcon(file.mimetype)}</span>
        )}

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

        {file.isStarred && (
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
        <p className="text-xs font-medium text-gray-200 truncate" title={file.originalName}>
          {truncate(file.originalName, 28)}
        </p>
        {file.organizer?.aliases?.length > 0 && (
          <p className="text-[10px] text-brand-glow truncate mt-1">
            @{file.organizer.aliases[0]}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-[10px] text-gray-600 font-mono">{formatBytes(file.size)}</p>
          {file.organizer?.relationships?.length > 0 && (
            <span className="text-[10px] text-gray-600 flex items-center gap-1">
              <Link2 size={10} /> {file.organizer.relationships.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function FileRow({ file, isSelected, selectMode, onToggle, onOpen }) {
  const accentColor = file.organizer?.color;

  return (
    <div
      onClick={() => (selectMode ? onToggle(file._id) : onOpen(file))}
      className={`card p-3 flex items-center gap-3 group cursor-pointer hover:border-surface-5 transition-all duration-150 ${
        isSelected ? "border-brand/50 bg-brand/5" : ""
      }`}
      style={accentColor ? { boxShadow: `inset 3px 0 0 ${accentColor}` } : undefined}
    >
      {selectMode && (
        <button onClick={(event) => { event.stopPropagation(); onToggle(file._id); }} className="flex-shrink-0">
          {isSelected
            ? <CheckSquare size={15} className="text-brand-glow" />
            : <Square size={15} className="text-gray-600" />
          }
        </button>
      )}

      <span className="text-xl flex-shrink-0">{getFileIcon(file.mimetype)}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-200 truncate" title={file.originalName}>
            {truncate(file.originalName, 50)}
          </p>
          {file.isStarred && <Star size={10} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
          <LabelDot labels={file.labels} size={7} maxShow={3} />
          {file.organizer?.aliases?.length > 0 && (
            <span className="text-[10px] text-brand-glow font-mono">@{file.organizer.aliases[0]}</span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-[11px] text-gray-600 font-mono">{formatBytes(file.size)}</span>
          <span className="text-[11px] text-gray-600">{formatDate(file.createdAt)}</span>
          {file.organizer?.relationships?.length > 0 && (
            <span className="text-[11px] text-gray-600 flex items-center gap-1">
              <Link2 size={10} /> {file.organizer.relationships.length}
            </span>
          )}
          {file.tags?.slice(0, 3).map((tag) => (
            <span key={tag} className="text-[10px] text-gray-700 font-mono">#{tag}</span>
          ))}
        </div>
      </div>
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

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const { pushAction } = useActionHistory();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt:desc");
  const [viewMode, setViewMode] = useState("grid");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [labelFilter, setLabelFilter] = useState(null);
  const [organizerView, setOrganizerView] = useState("all");
  const [previewFile, setPreviewFile] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showBulkTag, setShowBulkTag] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const searchInputRef = useRef(null);

  const organizer = useFileOrganizer(user?._id, files);
  const smartFolders = useSmartFolders(organizer.filesWithMeta);

  const fetchFiles = useCallback(async (nextPage = 1) => {
    setLoading(true);
    try {
      const [sortField, sortOrder] = sortBy.split(":");
      const sortParam = sortOrder === "desc" ? `-${sortField}` : sortField;
      const { data } = await api.get("/api/files", {
        params: { page: nextPage, limit: 40, sort: sortParam },
      });

      setFiles((prev) => {
        if (nextPage === 1) return data.files;
        const seen = new Set(prev.map((file) => file._id));
        return [...prev, ...data.files.filter((file) => !seen.has(file._id))];
      });
      setPagination(data.pagination || {});
    } catch {
      toast.error("Failed to load files.");
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    setPage(1);
    fetchFiles(1);
  }, [fetchFiles]);

  useEffect(() => {
    const handler = (event) => {
      const target = event.target;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === "g" || event.key === "G") setViewMode("grid");
      if (event.key === "l" || event.key === "L") setViewMode("list");
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filesAfterLabel = labelFilter
    ? smartFolders.filteredFiles.filter((file) => file.labels?.some((label) => label.name === labelFilter))
    : smartFolders.filteredFiles;

  const filesAfterOrganizerView = useMemo(() => {
    if (organizerView === "recent") {
      const recentSet = new Set(organizer.recentIds);
      return filesAfterLabel.filter((file) => recentSet.has(file._id));
    }
    if (organizerView === "aliases") return filesAfterLabel.filter((file) => file.organizer?.aliases?.length > 0);
    if (organizerView === "relationships") return filesAfterLabel.filter((file) => file.organizer?.relationships?.length > 0);
    if (organizerView === "colored") return filesAfterLabel.filter((file) => !!file.organizer?.color);
    return filesAfterLabel;
  }, [filesAfterLabel, organizer.recentIds, organizerView]);

  const filteredFiles = search
    ? filesAfterOrganizerView.filter((file) => {
        const query = search.toLowerCase();
        return (
          file.originalName?.toLowerCase().includes(query) ||
          file.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
          file.organizer?.aliases?.some((alias) => alias.toLowerCase().includes(query))
        );
      })
    : filesAfterOrganizerView;

  const selectedFiles = filteredFiles.filter((file) => selectedIds.has(file._id));
  const canDiff = selectedFiles.length === 2;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(filteredFiles.map((file) => file._id)));
  const clearSelect = () => {
    setSelectedIds(new Set());
    setSelectMode(false);
  };

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
      link.href = url;
      link.download = "files.zip";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Download failed.");
    }
  };

  const handleDelete = (fileId) => {
    const deletedFile = files.find((file) => file._id === fileId);
    setFiles((prev) => prev.filter((file) => file._id !== fileId));
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
        setFiles((prev) => prev.filter((file) => file._id !== fileId));
        refreshUser();
      },
    });
  };

  const handleStar = (fileId, nextStarred) => {
    setFiles((prev) => prev.map((file) => (
      file._id === fileId ? { ...file, isStarred: nextStarred } : file
    )));

    pushAction({
      undoLabel: nextStarred ? "Star removed." : "Star restored.",
      redoLabel: nextStarred ? "Star restored." : "Star removed again.",
      undo: async () => {
        if (nextStarred) await api.delete(`/api/files/${fileId}/star`);
        else await api.post(`/api/files/${fileId}/star`);
        setFiles((prev) => prev.map((file) => (
          file._id === fileId ? { ...file, isStarred: !nextStarred } : file
        )));
      },
      redo: async () => {
        if (nextStarred) await api.post(`/api/files/${fileId}/star`);
        else await api.delete(`/api/files/${fileId}/star`);
        setFiles((prev) => prev.map((file) => (
          file._id === fileId ? { ...file, isStarred: nextStarred } : file
        )));
      },
    });
  };

  const loadMore = useCallback(() => {
    if (loading) return;
    if (!pagination.pages || page >= pagination.pages) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFiles(nextPage);
  }, [fetchFiles, loading, page, pagination.pages]);

  const currentSortLabel = SORT_OPTIONS.find((option) => option.value === sortBy)?.label || "Sort";

  const emptyState = (
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
          : search
            ? "Try a different search term."
            : "This view has no matching files."}
      </p>
      {files.length === 0 && (
        <button onClick={() => { window.location.href = "/upload"; }} className="btn-primary px-5 py-2.5 mx-auto">
          <Upload size={14} /> Upload Files
        </button>
      )}
    </div>
  );

  return (
    <div className="flex h-full">
      <aside className="hidden xl:flex flex-col w-52 border-r border-surface-3 bg-surface-1 p-4 space-y-2 overflow-y-auto flex-shrink-0">
        <SmartFolderSidebar
          folders={smartFolders.folders}
          activeId={smartFolders.activeId}
          onSelect={smartFolders.setActiveId}
          getCount={smartFolders.getCount}
          onDelete={smartFolders.deleteFolder}
          showCreate={() => setShowSmartModal(true)}
        />
      </aside>

      <div className="flex-1 min-w-0 p-6 space-y-4 overflow-hidden flex flex-col">
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
            <button onClick={() => fetchFiles(1)} className="btn-ghost px-3 py-2">
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            </button>

            <div className="relative">
              <button onClick={() => setShowSortMenu((prev) => !prev)} className="btn-ghost text-sm px-3 py-2 flex items-center gap-1.5">
                <SlidersHorizontal size={13} /> {currentSortLabel} <ChevronDown size={11} />
              </button>
              {showSortMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-surface-1 border border-surface-4 rounded-xl shadow-2xl z-20 overflow-hidden animate-fade-up">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowSortMenu(false);
                      }}
                      className={`w-full px-4 py-2.5 text-xs text-left transition-colors ${
                        sortBy === option.value ? "bg-brand/10 text-brand-glow" : "text-gray-400 hover:bg-surface-3 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex bg-surface-2 border border-surface-4 rounded-lg p-0.5">
              {[{ id: "grid", icon: Grid3X3 }, { id: "list", icon: List }].map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setViewMode(id)}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === id ? "bg-surface-1 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>

            <button
              onClick={() => setSelectMode((prev) => !prev)}
              className={`btn-ghost text-sm px-3 py-2 flex items-center gap-1.5 ${
                selectMode ? "bg-brand/10 text-brand-glow border-brand/20" : ""
              }`}
            >
              <CheckSquare size={13} /> {selectMode ? "Cancel" : "Select"}
            </button>
          </div>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            ref={searchInputRef}
            className="input pl-8 text-sm"
            placeholder={`Filter ${smartFolders.activeFolder ? smartFolders.activeFolder.name : "files"}...`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>

        <LabelFilterBar files={files} activeLabel={labelFilter} onChange={setLabelFilter} />

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {ORGANIZER_VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setOrganizerView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all whitespace-nowrap ${
                organizerView === id
                  ? "bg-brand/10 text-brand-glow border-brand/20"
                  : "text-gray-500 border-surface-4 hover:text-white"
              }`}
            >
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {selectMode && (
          <div className="flex items-center gap-2 flex-wrap p-3 bg-brand/5 border border-brand/15 rounded-xl animate-fade-up">
            <span className="text-xs font-medium text-gray-300">{selectedIds.size} selected</span>
            <button onClick={selectAll} className="btn-ghost text-xs px-2.5 py-1.5">All</button>
            <button onClick={clearSelect} className="btn-ghost text-xs px-2.5 py-1.5 flex items-center gap-1">
              <X size={11} /> Clear
            </button>
            <div className="flex-1" />
            {selectedIds.size > 0 && (
              <>
                <button onClick={() => setShowBulkTag(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-surface-3 border border-surface-4 text-gray-300 hover:text-white transition-colors">
                  <Tag size={11} /> Tag
                </button>
                <button onClick={handleBulkDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-surface-3 border border-surface-4 text-gray-300 hover:text-white transition-colors">
                  Download
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

        {loading && files.length === 0 ? (
          <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3" : "space-y-2"}>
            {[...Array(12)].map((_, index) => (
              <div key={index} className={`skeleton rounded-xl ${viewMode === "grid" ? "aspect-video" : "h-16"}`} />
            ))}
          </div>
        ) : (
          <VirtualFileBrowser
            items={filteredFiles}
            viewMode={viewMode}
            loading={loading}
            hasMore={page < (pagination.pages || 1)}
            onLoadMore={loadMore}
            emptyState={emptyState}
            renderItem={(file) => (
              viewMode === "grid" ? (
                <FileCard
                  key={file._id}
                  file={file}
                  isSelected={selectedIds.has(file._id)}
                  selectMode={selectMode}
                  onToggle={toggleSelect}
                  onOpen={handleOpenPreview}
                />
              ) : (
                <FileRow
                  key={file._id}
                  file={file}
                  isSelected={selectedIds.has(file._id)}
                  selectMode={selectMode}
                  onToggle={toggleSelect}
                  onOpen={handleOpenPreview}
                />
              )
            )}
          />
        )}
      </div>

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
          onFileClick={(file) => {
            organizer.markRecent(file);
            setPreviewFile(file);
            setShowSearch(false);
          }}
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
          onCreate={(folder) => {
            smartFolders.createFolder(folder);
            setShowSmartModal(false);
          }}
        />
      )}
    </div>
  );
}
