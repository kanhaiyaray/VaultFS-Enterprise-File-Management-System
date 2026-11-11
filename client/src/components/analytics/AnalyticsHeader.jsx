import { useState, useEffect } from "react";
import { Calendar, ChevronDown, Download, RefreshCw, FileText, Clock } from "lucide-react";

const RANGES = [
  { id: "today", label: "Today" },
  { id: "7d",    label: "Last 7 Days" },
  { id: "30d",   label: "Last 30 Days" },
  { id: "90d",   label: "Last 90 Days" },
  { id: "12m",   label: "Last 12 Months" },
];


const getTabs = (isAdmin) => [
  { id: "overview", label: "Overview" },
  { id: "usage",    label: "Usage" },
  ...(isAdmin ? [{ id: "users", label: "Users & Teams" }] : []),
  { id: "files",    label: "Files" },
  { id: "security", label: "Security" },
  { id: "activity", label: "Activity" },
  { id: "reports",  label: "Reports" },
];


function useRelativeTime(date) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
  if (!date) return "—";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 30) return "just now";
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  return Math.floor(s / 3600) + "h ago";
}

export default function AnalyticsHeader({ range, setRange, tab, setTab, refreshing, onRefresh, onExport, lastUpdated, isAdmin }) {
  const TABS = getTabs(isAdmin);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const relTime = useRelativeTime(lastUpdated);
  const currentRange = RANGES.find((r) => r.id === range) || RANGES[2];

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">{isAdmin ? "Enterprise Analytics" : "My Analytics"}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{isAdmin ? "Workspace-wide insights, usage, security and performance." : "Your personal file insights, storage usage, and activity."}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <button onClick={() => { setRangeOpen(!rangeOpen); setExportOpen(false); }} className="btn-ghost text-sm px-3 py-2 flex items-center gap-2">
              <Calendar size={13} />
              {currentRange.label}
              <ChevronDown size={11} />
            </button>
            {rangeOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setRangeOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-44 bg-surface-1 border border-surface-4 rounded-xl shadow-2xl z-20 overflow-hidden animate-fade-up">
                  {RANGES.map((r) => (
                    <button key={r.id} onClick={() => { setRange(r.id); setRangeOpen(false); }} className={"w-full px-3 py-2 text-xs text-left transition-colors " + (range === r.id ? "bg-brand/10 text-brand-glow" : "text-gray-400 hover:bg-surface-3 hover:text-white")}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button onClick={onRefresh} disabled={refreshing} className="btn-ghost px-3 py-2">
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          </button>
          <div className="relative">
            <button onClick={() => { setExportOpen(!exportOpen); setRangeOpen(false); }} className="btn-primary text-sm px-3 py-2">
              <Download size={13} /> Export
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-surface-1 border border-surface-4 rounded-xl shadow-2xl z-20 overflow-hidden animate-fade-up">
                  <button onClick={() => { onExport("csv"); setExportOpen(false); }} className="w-full px-3 py-2.5 text-xs text-left text-gray-300 hover:bg-surface-3 hover:text-white transition-colors flex items-center gap-2">
                    <FileText size={12} /> Export CSV
                  </button>
                  <button onClick={() => { onExport("pdf"); setExportOpen(false); }} className="w-full px-3 py-2.5 text-xs text-left text-gray-300 hover:bg-surface-3 hover:text-white transition-colors flex items-center gap-2 border-t border-surface-3">
                    <FileText size={12} /> Save as PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 bg-surface-2 border border-surface-4 rounded-xl p-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={"px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all " + (tab === t.id ? "bg-surface-1 text-white shadow-sm border border-surface-4" : "text-gray-500 hover:text-gray-300")}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <Clock size={11} />
          <span>Updated {relTime}</span>
        </div>
      </div>
    </div>
  );
}
