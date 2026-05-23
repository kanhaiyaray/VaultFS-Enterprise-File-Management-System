/**
 * FileDiffViewer
 *
 * Compares two text files or two versions of the same file side-by-side
 * with unified diff highlighting (added / removed / unchanged lines).
 *
 * Uses the Myers diff algorithm implemented client-side (no dependency).
 *
 * Usage in DashboardPage (select 2 text files → "Compare" button):
 *   import FileDiffViewer from "../components/FileDiffViewer";
 *   {showDiff && <FileDiffViewer fileA={selectedFiles[0]} fileB={selectedFiles[1]} onClose={() => setShowDiff(false)} />}
 *
 * Or from FilePreviewModal "Versions" tab:
 *   <FileDiffViewer fileA={{ url: versionAUrl, name: "v1" }} fileB={{ url: versionBUrl, name: "v2" }} onClose={...} />
 */
import { useState, useEffect } from "react";
import { X, Loader2, GitCompare, Download, ChevronUp, ChevronDown, FileText } from "lucide-react";
import api from "../utils/api";   // ✅ added for authenticated requests

// ── Myers LCS diff ────────────────────────────────────────────────────────────
function computeDiff(linesA, linesB) {
  const result = [];
  let i = 0, j = 0;

  // Simple patience-like diff using LCS
  function lcs(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let r = 1; r <= m; r++) {
      for (let c = 1; c <= n; c++) {
        dp[r][c] = a[r - 1] === b[c - 1] ? dp[r - 1][c - 1] + 1 : Math.max(dp[r - 1][c], dp[r][c - 1]);
      }
    }
    const seq = [];
    let r = m, c = n;
    while (r > 0 && c > 0) {
      if (a[r - 1] === b[c - 1]) { seq.push([r - 1, c - 1]); r--; c--; }
      else if (dp[r - 1][c] > dp[r][c - 1]) r--;
      else c--;
    }
    return seq.reverse();
  }

  const common = lcs(linesA, linesB);
  let ai = 0, bi = 0;

  for (const [ai2, bi2] of common) {
    while (ai < ai2) { result.push({ type: "removed", line: linesA[ai], lineA: ai + 1, lineB: null }); ai++; }
    while (bi < bi2) { result.push({ type: "added",   line: linesB[bi], lineA: null,  lineB: bi + 1 }); bi++; }
    result.push({ type: "unchanged", line: linesA[ai], lineA: ai + 1, lineB: bi + 1 });
    ai++; bi++;
  }
  while (ai < linesA.length) { result.push({ type: "removed", line: linesA[ai], lineA: ai + 1, lineB: null }); ai++; }
  while (bi < linesB.length) { result.push({ type: "added",   line: linesB[bi], lineA: null,  lineB: bi + 1 }); bi++; }

  return result;
}

// ── Stats summary ─────────────────────────────────────────────────────────────
function diffStats(diff) {
  return {
    added:     diff.filter((d) => d.type === "added").length,
    removed:   diff.filter((d) => d.type === "removed").length,
    unchanged: diff.filter((d) => d.type === "unchanged").length,
  };
}

// ── Escape HTML for safe rendering ───────────────────────────────────────────
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── DiffLine ──────────────────────────────────────────────────────────────────
const DIFF_STYLES = {
  added:     { row: "bg-emerald-950/40 border-l-2 border-emerald-500",  gutter: "text-emerald-600 bg-emerald-950/30", prefix: "+", text: "text-emerald-300" },
  removed:   { row: "bg-red-950/40 border-l-2 border-red-500",         gutter: "text-red-600 bg-red-950/30",         prefix: "-", text: "text-red-300"     },
  unchanged: { row: "hover:bg-surface-2",                               gutter: "text-gray-700 bg-surface-0",         prefix: " ", text: "text-gray-400"    },
};

function DiffLine({ chunk, showLineNums = true }) {
  const s = DIFF_STYLES[chunk.type];
  return (
    <div className={`flex items-stretch text-xs font-mono leading-5 ${s.row}`}>
      {showLineNums && (
        <>
          <span className={`w-10 flex-shrink-0 text-right pr-2 py-0.5 select-none ${s.gutter}`}>
            {chunk.lineA ?? ""}
          </span>
          <span className={`w-10 flex-shrink-0 text-right pr-2 py-0.5 select-none ${s.gutter}`}>
            {chunk.lineB ?? ""}
          </span>
        </>
      )}
      <span className={`w-4 flex-shrink-0 text-center py-0.5 select-none ${s.gutter}`}>
        {s.prefix}
      </span>
      <span className={`flex-1 px-2 py-0.5 whitespace-pre overflow-hidden ${s.text}`}
            dangerouslySetInnerHTML={{ __html: esc(chunk.line) }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FileDiffViewer({ fileA, fileB, onClose }) {
  const [contentA, setA] = useState(null);
  const [contentB, setB] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [diff,     setDiff]     = useState([]);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [jumpIdx,  setJumpIdx]  = useState(0);

  // ✅ Use axios with authentication instead of plain fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      api.get(fileA.url, { responseType: "text" }).then(r => r.data),
      api.get(fileB.url, { responseType: "text" }).then(r => r.data),
    ])
      .then(([a, b]) => {
        if (cancelled) return;
        setA(a); setB(b);
        setDiff(computeDiff(a.split("\n"), b.split("\n")));
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [fileA.url, fileB.url]);

  const stats = diff.length ? diffStats(diff) : null;

  const changedChunks = diff.filter((d) => d.type !== "unchanged");
  const jumpToChange  = (dir) => {
    const idx = (jumpIdx + dir + changedChunks.length) % changedChunks.length;
    setJumpIdx(idx);
    const el = document.getElementById(`diff-line-${changedChunks[idx].lineA || changedChunks[idx].lineB}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const visibleDiff = showUnchanged
    ? diff
    : diff.filter((d, i) => {
        if (d.type !== "unchanged") return true;
        // Show context: ±3 lines around changes
        return diff.slice(Math.max(0, i - 3), i + 4).some((x) => x.type !== "unchanged");
      });

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface-1 border border-surface-4 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand/15 border border-brand/25 flex items-center justify-center">
            <GitCompare size={15} className="text-brand-glow" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-white text-sm">File Comparison</h2>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
              <span className="truncate max-w-[160px]" title={fileA.name || fileA.originalName}>
                {fileA.name || fileA.originalName}
              </span>
              <span>→</span>
              <span className="truncate max-w-[160px]" title={fileB.name || fileB.originalName}>
                {fileB.name || fileB.originalName}
              </span>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs text-emerald-400 font-mono font-bold">+{stats.added}</span>
              <span className="text-xs text-accent-red font-mono font-bold">-{stats.removed}</span>
              <span className="text-xs text-gray-600 font-mono">{stats.unchanged} unchanged</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {changedChunks.length > 0 && (
              <>
                <button onClick={() => jumpToChange(-1)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-surface-3 transition-all" title="Previous change">
                  <ChevronUp size={14} />
                </button>
                <span className="text-xs text-gray-600 font-mono">{changedChunks.length} changes</span>
                <button onClick={() => jumpToChange(1)} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-surface-3 transition-all" title="Next change">
                  <ChevronDown size={14} />
                </button>
              </>
            )}
            <button
              onClick={() => setShowUnchanged(!showUnchanged)}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition-all ${showUnchanged ? "bg-surface-3 border-surface-4 text-white" : "text-gray-500 border-surface-4 hover:text-white"}`}
            >
              {showUnchanged ? "Hide" : "Show"} unchanged
            </button>
            <button onClick={onClose} className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-surface-3 transition-all ml-1">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-2 gap-0 border-b border-surface-3 flex-shrink-0">
          {[fileA, fileB].map((f, i) => (
            <div key={i} className={`px-4 py-2 text-xs font-medium text-gray-400 flex items-center gap-2 ${i === 0 ? "border-r border-surface-3" : ""}`}>
              <FileText size={11} className="flex-shrink-0" />
              <span className="truncate">{f.name || f.originalName || `File ${i + 1}`}</span>
            </div>
          ))}
        </div>

        {/* Diff content */}
        <div className="flex-1 overflow-auto font-mono">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 size={22} className="animate-spin text-brand-glow" />
              <p className="text-sm text-gray-500">Computing diff…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-accent-red text-sm">{error}</p>
              <p className="text-gray-600 text-xs">Both files must be accessible text files.</p>
            </div>
          ) : diff.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <p className="text-emerald-400 text-sm font-medium">Files are identical</p>
              <p className="text-gray-600 text-xs">No differences detected.</p>
            </div>
          ) : (
            <div className="text-xs">
              {visibleDiff.map((chunk, i) => (
                <div id={`diff-line-${chunk.lineA || chunk.lineB}`} key={i}>
                  <DiffLine chunk={chunk} />
                </div>
              ))}
              {!showUnchanged && stats && (
                <div className="px-4 py-2 text-center text-xs text-gray-600 border-t border-surface-3">
                  {stats.unchanged} unchanged lines hidden •{" "}
                  <button onClick={() => setShowUnchanged(true)} className="text-brand-glow hover:underline">Show all</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}