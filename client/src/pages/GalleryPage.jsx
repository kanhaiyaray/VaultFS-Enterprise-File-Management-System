import { useState, useEffect } from "react";
import { Globe, Search, Download, Eye, RefreshCw, Image, Filter } from "lucide-react";
import api from "../utils/api";
import { formatBytes, formatDate, truncate } from "../utils/helpers";
import toast from "react-hot-toast";

export default function GalleryPage() {
  const [files,    setFiles]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [total,    setTotal]    = useState(0);
  const [preview,  setPreview]  = useState(null);

  const fetchGallery = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/files/public/gallery", {
        params: { page: p, limit: 24, search: search || undefined },
      });
      setFiles(data.files || []);
      setPages(data.pagination?.pages || 1);
      setTotal(data.pagination?.total || 0);
      setPage(p);
    } catch {
      toast.error("Failed to load gallery.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGallery(1); }, []);
  useEffect(() => { if (search !== undefined) fetchGallery(1); }, [search]);

  const handleDownload = async (file) => {
    try {
      const { data } = await api.get(`/api/files/${file._id}/signed-url`);
      window.open(data.url, "_blank");
    } catch {
      toast.error("Download unavailable.");
    }
  };

  const isImage = (mime) => mime?.startsWith("image/");

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/20 flex items-center justify-center">
            <Globe size={16} className="text-brand-glow" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl text-white">Public Gallery</h1>
            <p className="text-xs text-gray-500">{total} public file{total !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={() => fetchGallery(page)} disabled={loading} className="btn-ghost text-sm px-3 py-2">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search gallery…"
          className="input pl-9"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl skeleton" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="card p-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-3 border border-surface-4 flex items-center justify-center mx-auto mb-4">
            <Image size={28} className="text-gray-600" />
          </div>
          <p className="text-gray-400 font-display font-semibold text-lg">Gallery is empty</p>
          <p className="text-gray-600 text-sm mt-1">No public files have been shared yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {files.map((file) => (
            <div
              key={file._id}
              className="group relative aspect-square rounded-xl overflow-hidden bg-surface-2 border border-surface-4 hover:border-brand/40 cursor-pointer transition-all hover:shadow-glow-sm"
              onClick={() => setPreview(file)}
            >
              {isImage(file.mimetype) && (file.thumbnailUrl || file.url) ? (
                <img
                  src={file.thumbnailUrl || file.url}
                  alt={file.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                  <span className="text-3xl">{file.mimetype?.startsWith("video/") ? "🎬" : file.mimetype === "application/pdf" ? "📄" : "📁"}</span>
                  <p className="text-[10px] text-gray-500 text-center px-2 truncate w-full">{file.originalName}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                <p className="text-xs text-white text-center font-medium leading-tight">{truncate(file.originalName, 30)}</p>
                <p className="text-[10px] text-gray-400">{formatBytes(file.size)}</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreview(file); }}
                    className="p-1.5 rounded-lg bg-surface-3 text-gray-300 hover:text-white transition-colors"
                  >
                    <Eye size={12} />
                  </button>
                  {!file.shareViewOnly && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                      className="p-1.5 rounded-lg bg-brand/20 text-brand-glow hover:bg-brand/30 transition-colors"
                    >
                      <Download size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => fetchGallery(page - 1)} disabled={page === 1 || loading} className="btn-ghost text-sm">
            Previous
          </button>
          <span className="text-sm text-gray-500 font-mono">{page} / {pages}</span>
          <button onClick={() => fetchGallery(page + 1)} disabled={page === pages || loading} className="btn-ghost text-sm">
            Next
          </button>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="card p-4 animate-fade-up">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white truncate">{preview.originalName}</p>
                <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-white transition-colors text-xs">✕</button>
              </div>
              {isImage(preview.mimetype) ? (
                <img src={preview.url} alt={preview.originalName} className="w-full max-h-[60vh] object-contain rounded-lg" />
              ) : (
                <div className="h-40 flex items-center justify-center bg-surface-2 rounded-lg">
                  <span className="text-5xl">{preview.mimetype?.startsWith("video/") ? "🎬" : "📄"}</span>
                </div>
              )}
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-500">{formatBytes(preview.size)} · {formatDate(preview.createdAt)}</p>
                {!preview.shareViewOnly && (
                  <button onClick={() => handleDownload(preview)} className="btn-primary text-xs px-3 py-1.5">
                    <Download size={12} /> Download
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
