import { useState, useEffect, useCallback } from "react";
import { Star, Search, RefreshCw, Download, Trash2, Eye } from "lucide-react";
import api from "../utils/api";
import { formatBytes, formatDate, getFileIcon, truncate } from "../utils/helpers";
import toast from "react-hot-toast";

export default function StarredPage() {
  const [files,   setFiles]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [preview, setPreview] = useState(null);

  const fetchStarred = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/files/starred");
      setFiles(data.files || []);
    } catch {
      toast.error("Failed to load starred files.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStarred(); }, [fetchStarred]);

  const handleUnstar = async (file) => {
    try {
      await api.delete(`/api/files/${file._id}/star`);
      setFiles((prev) => prev.filter((f) => f._id !== file._id));
      toast.success(`"${file.originalName}" unstarred.`);
    } catch {
      toast.error("Failed to unstar file.");
    }
  };

  const handleDownload = async (file) => {
    try {
      const { data } = await api.get(`/api/files/${file._id}/signed-url`);
      window.open(data.url, "_blank");
    } catch {
      toast.error("Download failed.");
    }
  };

  const filtered = search
    ? files.filter((f) => f.originalName?.toLowerCase().includes(search.toLowerCase()) ||
        f.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())))
    : files;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-900/20 border border-amber-900/30 flex items-center justify-center">
            <Star size={16} className="text-accent-amber fill-accent-amber" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white">Starred Files</h1>
            <p className="text-xs text-gray-500">{files.length} file{files.length !== 1 ? "s" : ""} starred</p>
          </div>
        </div>
        <button onClick={fetchStarred} disabled={loading} className="btn-ghost text-sm px-3 py-2">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search starred files…"
          className="input pl-9"
        />
      </div>

      {/* File list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="card h-16 skeleton rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-3 border border-surface-4 flex items-center justify-center mx-auto mb-4">
            <Star size={28} className="text-gray-600" />
          </div>
          <p className="text-gray-400 font-display font-semibold text-lg">
            {files.length === 0 ? "No starred files" : "No matching files"}
          </p>
          <p className="text-gray-600 text-sm mt-1">
            {files.length === 0
              ? "Star important files from your dashboard to pin them here."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((file) => (
            <div
              key={file._id}
              className="card p-4 flex items-center gap-3 group hover:border-surface-5 transition-all duration-200"
            >
              <span className="text-2xl flex-shrink-0">{getFileIcon(file.mimetype)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{truncate(file.originalName, 50)}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="text-xs text-gray-600 font-mono">{formatBytes(file.size)}</span>
                  <span className="text-xs text-gray-600">{formatDate(file.createdAt)}</span>
                  {file.tags?.slice(0, 3).map((tag) => (
                    <span key={tag} className="badge bg-brand/10 text-brand-glow text-[10px]">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDownload(file)}
                  title="Download"
                  className="p-2 rounded-lg bg-surface-3 text-gray-400 hover:text-white hover:bg-surface-4 transition-all"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => handleUnstar(file)}
                  title="Unstar"
                  className="p-2 rounded-lg bg-amber-900/15 text-accent-amber hover:bg-amber-900/30 transition-all"
                >
                  <Star size={14} className="fill-accent-amber" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
