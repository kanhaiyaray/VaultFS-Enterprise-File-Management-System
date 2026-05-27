/**
 * AdvancedSearch
 *
 * Full-featured search panel for DashboardPage:
 *  - Full-text query
 *  - MIME type / tag / date range filters
 *  - Boolean mode: AND / OR / NOT
 *  - Saved searches (persisted to localStorage) with reordering (up/down)
 *  - Skeleton loading while fetching results
 *  - Results rendered inline with file cards
 */

import { useState, useCallback, useEffect } from "react";
import {
  Search, X, Filter, Save, Clock, Tag, FileType, Calendar,
  Loader2, ChevronRight, BookmarkPlus, Bookmark, Trash2, Star,
  SlidersHorizontal, Plus, ChevronUp, ChevronDown,
} from "lucide-react";
import api from "../utils/api";
import { formatBytes, formatDate, getFileIcon, truncate } from "../utils/helpers";
import toast from "react-hot-toast";

const SAVED_KEY = "vaultfs_saved_searches";

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); }
  catch { return []; }
}

function saveSaved(arr) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(arr.slice(0, 10)));
}

const FILE_TYPES = [
  { label: "Images", value: "image" },
  { label: "PDFs", value: "application/pdf" },
  { label: "Video", value: "video" },
  { label: "Audio", value: "audio" },
  { label: "Documents", value: "application/vnd" },
  { label: "Archives", value: "application/zip" },
  { label: "Text", value: "text" },
];

const SORT_OPTIONS = [
  { label: "Newest", value: "createdAt:desc" },
  { label: "Oldest", value: "createdAt:asc" },
  { label: "Largest", value: "size:desc" },
  { label: "Smallest", value: "size:asc" },
  { label: "Name A–Z", value: "originalName:asc" },
];

// ── Filter Chip ─────────────────────────────────────────────────────────────
function FilterChip({ label, onRemove, color = "bg-brand/10 border-brand/20 text-brand-glow" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${color}`}>
      {label}
      <button onClick={onRemove} className="opacity-60 hover:opacity-100 transition-opacity">
        <X size={10} />
      </button>
    </span>
  );
}

// ── Result Card ─────────────────────────────────────────────────────────────
function ResultCard({ file, onClick }) {
  return (
    <div
      onClick={() => onClick(file)}
      className="card p-3 flex items-center gap-3 cursor-pointer hover:border-brand/30 hover:bg-brand/5 transition-all duration-150 group"
    >
      <span className="text-2xl flex-shrink-0">{getFileIcon(file.mimetype)}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white transition-colors" title={file.originalName}>
          {truncate(file.originalName, 50)}
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-[11px] text-gray-600 font-mono">{formatBytes(file.size)}</span>
          <span className="text-[11px] text-gray-600">{formatDate(file.createdAt)}</span>
          {file.tags?.slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] text-gray-600 font-mono">#{t}</span>
          ))}
        </div>
        {file.description && (
          <p className="text-[11px] text-gray-600 mt-0.5 truncate">{file.description}</p>
        )}
      </div>
      <ChevronRight size={14} className="text-gray-600 group-hover:text-brand-glow transition-colors flex-shrink-0" />
    </div>
  );
}

// ── Skeleton Card (loading placeholder) ─────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="card p-3 flex items-center gap-3 animate-pulse">
      <div className="w-8 h-8 rounded bg-surface-3 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-surface-3 rounded w-3/4" />
        <div className="flex gap-2">
          <div className="h-3 bg-surface-3 rounded w-16" />
          <div className="h-3 bg-surface-3 rounded w-20" />
        </div>
      </div>
      <div className="w-4 h-4 rounded-full bg-surface-3" />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdvancedSearch({ onClose, onFileClick }) {
  // Query state
  const [query, setQuery] = useState("");
  const [operator, setOperator] = useState("AND");
  const [notTerms, setNotTerms] = useState([]);
  const [notInput, setNotInput] = useState("");
  const [mimeFilter, setMime] = useState("");
  const [tagFilter, setTagF] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt:desc");
  const [starredOnly, setStarred] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Results
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  // Saved searches
  const [saved, setSaved] = useState(loadSaved);
  const [showSaved, setShowSaved] = useState(false);

  // ── Build API params ─────────────────────────────────────────────────────
  const buildParams = useCallback((pg = 1) => {
    const [sortField, sortOrder] = sortBy.split(":");
    const params = {
      page: pg, limit: 20,
      sortBy: sortField, order: sortOrder,
    };

    let q = query.trim();
    if (notTerms.length) {
      q += " " + notTerms.map((t) => `-${t}`).join(" ");
    }
    if (q) params.q = q;
    if (operator === "OR" && q) params.operator = "or";

    if (mimeFilter) params.mimetype = mimeFilter;
    if (tagFilter.length) params.tags = tagFilter.join(",");
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (starredOnly) params.starred = true;

    return params;
  }, [query, operator, notTerms, mimeFilter, tagFilter, dateFrom, dateTo, sortBy, starredOnly]);

  // ── Perform search ───────────────────────────────────────────────────────
  const doSearch = useCallback(async (pg = 1, append = false) => {
    const params = buildParams(pg);
    if (!params.q && !params.mimetype && !params.tags && !params.starred && !params.dateFrom) {
      return toast.error("Enter a search term or apply at least one filter.");
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data } = await api.get("/api/files/search", { params });
      setResults((prev) => append ? [...prev, ...data.files] : data.files);
      setTotal(data.pagination?.total || data.files.length);
      setPages(data.pagination?.pages || 1);
      setPage(pg);
    } catch (err) {
      toast.error(err.response?.data?.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  const handleKey = (e) => {
    if (e.key === "Enter") doSearch(1);
  };

  const addNotTerm = () => {
    const t = notInput.trim();
    if (t && !notTerms.includes(t)) setNotTerms((p) => [...p, t]);
    setNotInput("");
  };

  const addTagFilter = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tagFilter.includes(t)) setTagF((p) => [...p, t]);
    setTagInput("");
  };

  // ── Saved searches helpers ──────────────────────────────────────────────
  const saveSearch = () => {
    const label = query || `Filter: ${[mimeFilter, ...tagFilter].filter(Boolean).join(", ")}`;
    const entry = { label, query, operator, notTerms, mimeFilter, tagFilter, dateFrom, dateTo, starredOnly, savedAt: new Date().toISOString() };
    const updated = [entry, ...saved.filter((s) => s.label !== label)];
    setSaved(updated);
    saveSaved(updated);
    toast.success("Search saved!");
  };

  const loadSavedSearch = (s) => {
    setQuery(s.query || "");
    setOperator(s.operator || "AND");
    setNotTerms(s.notTerms || []);
    setMime(s.mimeFilter || "");
    setTagF(s.tagFilter || []);
    setDateFrom(s.dateFrom || "");
    setDateTo(s.dateTo || "");
    setStarred(s.starredOnly || false);
    setShowSaved(false);
  };

  const deleteSaved = (i) => {
    const updated = saved.filter((_, idx) => idx !== i);
    setSaved(updated);
    saveSaved(updated);
  };

  // Reorder saved search
  const moveSaved = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= saved.length) return;
    const updated = [...saved];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSaved(updated);
    saveSaved(updated);
  };

  // ── Active filters for display ──────────────────────────────────────────
  const activeFilters = [
    mimeFilter && { label: `Type: ${FILE_TYPES.find((f) => f.value === mimeFilter)?.label || mimeFilter}`, onRemove: () => setMime("") },
    ...tagFilter.map((t) => ({ label: `#${t}`, onRemove: () => setTagF((p) => p.filter((x) => x !== t)) })),
    dateFrom && { label: `From: ${dateFrom}`, onRemove: () => setDateFrom("") },
    dateTo && { label: `To: ${dateTo}`, onRemove: () => setDateTo("") },
    starredOnly && { label: "⭐ Starred only", onRemove: () => setStarred(false) },
    ...notTerms.map((t) => ({ label: `NOT: ${t}`, onRemove: () => setNotTerms((p) => p.filter((x) => x !== t)), color: "bg-red-900/10 border-red-900/20 text-accent-red" })),
  ].filter(Boolean);

  const skeletonCount = 4;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-16 p-4" onClick={onClose}>
      <div
        className="bg-surface-1 border border-surface-4 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-surface-3">
          <div className="w-8 h-8 rounded-lg bg-brand/15 border border-brand/25 flex items-center justify-center flex-shrink-0">
            <Search size={15} className="text-brand-glow" />
          </div>
          <h2 className="font-display font-bold text-white">Advanced Search</h2>
          <button onClick={onClose} className="ml-auto text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Search bar */}
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <div className="flex bg-surface-2 border border-surface-4 rounded-lg p-0.5 flex-shrink-0">
                {["AND", "OR"].map((op) => (
                  <button
                    key={op}
                    onClick={() => setOperator(op)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-all ${operator === op ? "bg-surface-1 text-white shadow-sm" : "text-gray-500"
                      }`}
                  >
                    {op}
                  </button>
                ))}
              </div>

              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  autoFocus
                  className="input pl-8 text-sm"
                  placeholder='Search files… (use "" for exact phrases)'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKey}
                />
              </div>

              <button
                onClick={() => doSearch(1)}
                disabled={loading}
                className="btn-primary px-4 flex-shrink-0"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              </button>
            </div>

            {/* Active filters */}
            {activeFilters.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeFilters.map((f, i) => (
                  <FilterChip key={i} label={f.label} onRemove={f.onRemove} color={f.color} />
                ))}
                <button
                  onClick={() => { setMime(""); setTagF([]); setDateFrom(""); setDateTo(""); setStarred(false); setNotTerms([]); }}
                  className="text-xs text-gray-600 hover:text-accent-red transition-colors px-2"
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${showFilters || activeFilters.length
                    ? "bg-brand/10 border-brand/25 text-brand-glow"
                    : "btn-ghost"
                  }`}
              >
                <SlidersHorizontal size={11} />
                Filters
                {activeFilters.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-brand text-white text-[9px] font-bold flex items-center justify-center">
                    {activeFilters.length}
                  </span>
                )}
              </button>

              <select
                className="input text-xs py-1.5 flex-1 max-w-[140px]"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>

              <button
                onClick={() => setShowSaved(!showSaved)}
                className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5"
              >
                <Bookmark size={11} /> Saved {saved.length > 0 && `(${saved.length})`}
              </button>

              {(query || activeFilters.length > 0) && (
                <button onClick={saveSearch} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5">
                  <BookmarkPlus size={11} /> Save
                </button>
              )}
            </div>

            {/* Filters panel */}
            {showFilters && (
              <div className="card p-4 space-y-4 animate-fade-up">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-2">
                    <FileType size={11} /> File Type
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {FILE_TYPES.map((ft) => (
                      <button
                        key={ft.value}
                        onClick={() => setMime(mimeFilter === ft.value ? "" : ft.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs border transition-all ${mimeFilter === ft.value
                            ? "bg-brand/15 border-brand/30 text-brand-glow"
                            : "bg-surface-2 border-surface-4 text-gray-400 hover:text-white"
                          }`}
                      >
                        {ft.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-2">
                    <Tag size={11} /> Tags
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="input text-xs flex-1"
                      placeholder="Add tag filter…"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addTagFilter()}
                    />
                    <button onClick={addTagFilter} className="btn-ghost px-3"><Plus size={13} /></button>
                  </div>
                </div>

                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-400 mb-2">
                    <Calendar size={11} /> Date Range (uploaded)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="input text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                    <input type="date" className="input text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2">Exclude (NOT operator)</label>
                  <div className="flex gap-2">
                    <input
                      className="input text-xs flex-1"
                      placeholder="Term to exclude…"
                      value={notInput}
                      onChange={(e) => setNotInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addNotTerm()}
                    />
                    <button onClick={addNotTerm} className="btn-ghost px-3"><Plus size={13} /></button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!starredOnly}
                      onChange={(e) => setStarred(e.target.checked)}
                      className="w-4 h-4 rounded border-surface-5 bg-surface-3 accent-brand cursor-pointer"
                    />
                    <span className="text-sm text-gray-400 flex items-center gap-1.5">
                      <Star size={12} className={starredOnly ? "text-yellow-400" : "text-gray-600"} />
                      Starred files only
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Saved searches panel – with always-visible buttons */}
            {showSaved && (
              <div className="card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={10} /> Saved Searches
                  </p>
                  <span className="text-[10px] text-gray-600">{saved.length} saved</span>
                </div>

                {saved.length === 0 ? (
                  <p className="text-xs text-gray-600 py-3 text-center">No saved searches yet.</p>
                ) : (
                  <div className="space-y-1">
                    {saved.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-surface-2/50 rounded-lg p-1 pr-2">
                        <button
                          onClick={() => loadSavedSearch(s)}
                          className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-3 transition-colors text-left"
                        >
                          <Search size={11} className="text-gray-500 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-200 truncate">{s.label || "Unnamed"}</p>
                            <p className="text-[10px] text-gray-600">{formatDate(s.savedAt)}</p>
                          </div>
                        </button>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {idx > 0 && (
                            <button
                              onClick={() => moveSaved(idx, -1)}
                              className="p-1 text-gray-500 hover:text-brand-glow transition-colors"
                              title="Move up"
                            >
                              <ChevronUp size={12} />
                            </button>
                          )}
                          {idx < saved.length - 1 && (
                            <button
                              onClick={() => moveSaved(idx, 1)}
                              className="p-1 text-gray-500 hover:text-brand-glow transition-colors"
                              title="Move down"
                            >
                              <ChevronDown size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteSaved(idx)}
                            className="p-1 text-gray-500 hover:text-accent-red transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results section with skeleton */}
          {searched && (
            <div className="px-4 pb-4 space-y-2 border-t border-surface-3 pt-4">
              <p className="text-xs text-gray-500 mb-2">
                {loading && results.length === 0 ? "Searching…" : `${total} result${total !== 1 ? "s" : ""}`}
              </p>

              {loading && results.length === 0 ? (
                <div className="space-y-1.5">
                  {[...Array(skeletonCount)].map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : results.length === 0 ? (
                <div className="py-8 text-center">
                  <Search size={28} className="text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No files match your search.</p>
                  <p className="text-xs text-gray-600 mt-1">Try different keywords or adjust filters.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {results.map((f) => (
                      <ResultCard key={f._id} file={f} onClick={(file) => { onFileClick?.(file); onClose(); }} />
                    ))}
                  </div>
                  {page < pages && (
                    <button
                      onClick={() => doSearch(page + 1, true)}
                      disabled={loading}
                      className="w-full py-2.5 text-xs text-gray-500 hover:text-white border border-surface-4 rounded-lg hover:bg-surface-2 transition-all flex items-center justify-center gap-1.5"
                    >
                      {loading ? <Loader2 size={11} className="animate-spin" /> : null}
                      Load more ({total - results.length} remaining)
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}