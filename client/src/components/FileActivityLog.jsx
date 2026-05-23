/**
 * FileActivityLog — shows per-file access log entries.
 * Backend: GET /api/files/:id/access-logs  → { accessLogs: [...] }
 */
import { useState, useEffect, useCallback } from "react";
import {
  Activity, Eye, Download, Upload, Edit3, Star, Share2,
  Loader2, RefreshCw, Clock,
} from "lucide-react";
import api from "../utils/api";
import { formatDate } from "../utils/helpers";

const ACTION_META = {
  view:     { icon: Eye,      label: "Viewed",     color: "text-gray-400",    bg: "bg-surface-3 border-surface-4"           },
  download: { icon: Download, label: "Downloaded",  color: "text-brand-glow",  bg: "bg-brand/10 border-brand/20"             },
  upload:   { icon: Upload,   label: "Uploaded",    color: "text-emerald-400", bg: "bg-emerald-900/15 border-emerald-900/25" },
  update:   { icon: Edit3,    label: "Updated",     color: "text-amber-400",   bg: "bg-amber-900/15 border-amber-900/25"     },
  star:     { icon: Star,     label: "Starred",     color: "text-yellow-400",  bg: "bg-yellow-900/15 border-yellow-900/25"   },
  share:    { icon: Share2,   label: "Shared",      color: "text-purple-400",  bg: "bg-purple-900/15 border-purple-900/25"   },
};

function LogEntry({ log }) {
  const meta = ACTION_META[log.action] || ACTION_META.view;
  const Icon = meta.icon;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-surface-3 last:border-0">
      <div className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.bg}`}>
        <Icon size={12} className={meta.color} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-200">
            {log.user?.displayName || log.user?.username || "Anonymous"}
          </span>
          <span className={`text-xs ${meta.color}`}>{meta.label}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] text-gray-600 flex items-center gap-1">
            <Clock size={9} /> {formatDate(log.at || log.createdAt)}
          </span>
          {log.ip && <span className="text-[11px] text-gray-700 font-mono">{log.ip}</span>}
        </div>
      </div>
    </div>
  );
}

const ACTION_FILTERS = [
  { value: "",         label: "All"       },
  { value: "view",     label: "Views"     },
  { value: "download", label: "Downloads" },
  { value: "update",   label: "Edits"     },
  { value: "share",    label: "Shares"    },
];

export default function FileActivityLog({ fileId, isOwner }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);
  const [filter,  setFilter]  = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/files/${fileId}/access-logs`);

      // BUG FIX: backend returns { success, accessLogs: [] }
      // Previous code did `data.logs || data` which returned the whole object
      let entries = [];
      if (Array.isArray(data.accessLogs))     entries = data.accessLogs;
      else if (Array.isArray(data.logs))       entries = data.logs;
      else if (Array.isArray(data))            entries = data;

      // Client-side filter by action (backend doesn't support it on access-logs endpoint)
      if (filter) entries = entries.filter((l) => l.action === filter);

      setLogs(entries);
      setTotal(entries.length);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [fileId, filter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const safeLogs = Array.isArray(logs) ? logs : [];

  if (!isOwner) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Activity size={28} className="text-gray-600" />
        <p className="text-sm text-gray-500">Activity log is only visible to the file owner.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{total} event{total !== 1 ? "s" : ""} recorded</p>
        <button onClick={fetchLogs} disabled={loading} className="btn-ghost text-xs px-2.5 py-1.5">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {ACTION_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 border transition-all ${
              filter === f.value
                ? "bg-brand/15 border-brand/30 text-brand-glow"
                : "bg-surface-2 border-surface-4 text-gray-500 hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && safeLogs.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-brand-glow" />
        </div>
      ) : safeLogs.length === 0 ? (
        <div className="py-10 text-center">
          <Activity size={28} className="text-gray-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No activity yet.</p>
        </div>
      ) : (
        <div className="card px-4 py-1">
          {safeLogs.map((log, i) => (
            <LogEntry key={log._id || i} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
