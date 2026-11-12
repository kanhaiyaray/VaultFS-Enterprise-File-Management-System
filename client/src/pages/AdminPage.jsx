import { useState, useEffect, useCallback, useMemo, useRef, Component } from "react";
import {
  Users, FileText, BarChart3, Shield, Megaphone, Palette,
  Search, RefreshCw, ChevronDown, ChevronUp, ChevronRight, Ban, UserCheck, Key,
  Trash2, Eye, Download, AlertTriangle, CheckCircle2, X, XCircle, Loader2,
  Clock, Database, TrendingUp,
  CheckSquare, Square, Send, ExternalLink,
  Activity, Filter,
  Minus, Radio, Gauge, ArrowUpRight, ArrowDownRight,
  Zap, ShieldAlert, Users2, Pause,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import api from "../utils/api";
import { formatBytes, formatDate } from "../utils/helpers";
import toast from "react-hot-toast";
import { AdminBrandingEditor } from "../components/BrandingProvider";
import { useSocket } from "../hooks/useSocket";

// ─────────────────────────────────────────────────────────────────────────────
//  ErrorBoundary — prevents a single tab bug from crashing the whole admin page
// ─────────────────────────────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[AdminPanel ErrorBoundary]", error, info);
  }
  reset = () => this.setState({ hasError: false, error: null });
  render() {
    if (this.state.hasError) {
      return (
        <div className="card p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-red-900/20 border border-red-900/30 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={22} className="text-accent-red" />
          </div>
          <p className="text-gray-300 font-medium mb-1">Something went wrong in this tab</p>
          <p className="text-gray-500 text-xs mb-4 font-mono">{this.state.error?.message || "Unknown error"}</p>
          <button onClick={this.reset} className="btn-ghost text-xs px-4 py-2 mx-auto">
            <RefreshCw size={11} /> Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared helpers
// ─────────────────────────────────────────────────────────────────────────────
const RANGE_OPTIONS = [
  { id: "today", label: "Today" }, { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" }, { id: "90d", label: "90 days" },
  { id: "12m", label: "12 months" },
];

const FILE_TYPE_COLORS = ["#8b5cf6", "#a78bfa", "#22d3ee", "#34d399", "#f59e0b", "#ec4899", "#64748b"];

function timeAgo(date) {
  if (!date) return "—";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const StatCard = ({ icon: Icon, label, value, sub, trend, color = "text-brand-glow", bg = "bg-brand/10 border-brand/20" }) => (
  <div className="card p-4 group hover:border-brand/30 transition-all">
    <div className="flex items-start justify-between gap-2 mb-3">
      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon size={18} className={color} />
      </div>
      {trend !== undefined && trend !== null && (
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
          trend > 0 ? "text-emerald-400 bg-emerald-900/20 border-emerald-900/30"
          : trend < 0 ? "text-accent-red bg-red-900/20 border-red-900/30"
          : "text-gray-500 bg-surface-3 border-surface-4"}`}>
          {trend > 0 ? <ArrowUpRight size={9} /> : trend < 0 ? <ArrowDownRight size={9} /> : <Minus size={9} />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-xs text-gray-500 font-medium">{label}</p>
    <p className="text-xl font-bold text-white font-mono mt-0.5 truncate">{value ?? "—"}</p>
    {sub && <p className="text-[11px] text-gray-600 mt-0.5 truncate">{sub}</p>}
  </div>
);

const Badge = ({ children, variant = "default" }) => {
  const styles = {
    default: "bg-surface-3 text-gray-400 border-surface-4",
    admin: "bg-amber-900/20 text-amber-300 border-amber-900/30",
    banned: "bg-red-900/20 text-accent-red border-red-900/30",
    active: "bg-emerald-900/20 text-emerald-400 border-emerald-900/30",
    brand: "bg-brand/15 text-brand-glow border-brand/25",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
};

function ConfirmModal({ title, message, confirmLabel = "Confirm", danger = true, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-1 border border-surface-4 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? "bg-red-900/30 border border-red-900/50" : "bg-amber-900/30 border border-amber-900/50"}`}>
            <AlertTriangle size={18} className={danger ? "text-accent-red" : "text-accent-amber"} />
          </div>
          <h3 className="font-display font-bold text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 justify-center font-semibold rounded-lg px-4 py-2 text-sm transition-all ${danger ? "bg-accent-red/15 text-accent-red border border-red-900/40 hover:bg-accent-red/25" : "btn-primary"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SortableTh({ label, field, sortBy, sortOrder, onSort, className = "" }) {
  const active = sortBy === field;
  return (
    <th
      onClick={() => onSort(field)}
      className={`px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap cursor-pointer select-none transition-colors ${active ? "text-brand-glow" : "text-gray-500 hover:text-white"} ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (sortOrder === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : null}
      </span>
    </th>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  User Detail Drawer
// ─────────────────────────────────────────────────────────────────────────────
function UserDetailDrawer({ userId, onClose, onAction }) {
  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.allSettled([
      api.get(`/api/admin/users/${userId}`),
      api.get(`/api/admin/users/${userId}/activities`, { params: { limit: 20 } }),
      api.get("/api/admin/files", { params: { userId, limit: 10 } }),
    ]).then(([uRes, aRes, fRes]) => {
      if (uRes.status === "fulfilled") setUser(uRes.value.data?.user || null);
      if (aRes.status === "fulfilled") setActivities(Array.isArray(aRes.value.data?.activities) ? aRes.value.data.activities : []);
      if (fRes.status === "fulfilled") setFiles(Array.isArray(fRes.value.data?.files) ? fRes.value.data.files : []);
    }).finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  const TABS = [
    { id: "overview", label: "Overview" },
    { id: "activity", label: `Activity (${activities.length})` },
    { id: "files", label: `Files (${files.length})` },
  ];

  return (
    <>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]" onClick={onClose}>
        <div
          className="absolute right-0 top-0 h-full w-full max-w-lg bg-surface-1 border-l border-surface-4 shadow-2xl overflow-y-auto"
          style={{ animation: "slideInRight 0.25s ease-out" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-surface-1 z-10 border-b border-surface-3 px-5 py-4 flex items-center justify-between">
            <h2 className="font-display font-bold text-white">User Details</h2>
            <button onClick={onClose} className="p-1.5 rounded text-gray-500 hover:text-white"><X size={16} /></button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-brand-glow" /></div>
          ) : !user ? (
            <div className="text-center py-16 text-gray-500 text-sm">Failed to load user.</div>
          ) : (
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-brand/15 border border-brand/25 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl font-bold text-brand-glow">{(user.displayName || user.username)?.[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-white truncate">{user.displayName || user.username}</h3>
                    <Badge variant={user.role === "admin" ? "admin" : "default"}>{user.role}</Badge>
                    {user.isBanned && <Badge variant="banned">Banned</Badge>}
                    {user.emailVerified && <Badge variant="active">Verified</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">@{user.username}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {user.isBanned ? (
                  <button onClick={() => onAction("unban", user)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-900/20 border border-emerald-900/30 text-emerald-400 hover:bg-emerald-900/30">
                    <UserCheck size={11} /> Unban
                  </button>
                ) : (
                  <button onClick={() => onAction("ban", user)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-900/15 border border-red-900/30 text-accent-red hover:bg-red-900/30">
                    <Ban size={11} /> Ban
                  </button>
                )}
                <button onClick={() => onAction("reset", user)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-amber-900/15 border border-amber-900/30 text-amber-400 hover:bg-amber-900/30">
                  <Key size={11} /> Force Reset
                </button>
                <button onClick={() => onAction("impersonate", user)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-brand/10 border border-brand/25 text-brand-glow hover:bg-brand/20">
                  <Eye size={11} /> Impersonate
                </button>
              </div>

              <div className="flex gap-1 bg-surface-2 border border-surface-4 rounded-lg p-0.5">
                {TABS.map((t) => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tab === t.id ? "bg-surface-1 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"}`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === "overview" && (
                <div className="space-y-1">
                  {[
                    { label: "User ID", value: user._id, mono: true },
                    { label: "Storage", value: `${formatBytes(user.storageUsed)} / ${formatBytes(user.storageLimit)}` },
                    { label: "Files", value: user.fileCount || 0 },
                    { label: "Trash", value: user.trashCount || 0 },
                    { label: "Upload Count", value: user.uploadCount || 0 },
                    { label: "2FA", value: user.twoFactorEnabled ? "Enabled" : "Disabled" },
                    { label: "Last Login", value: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never" },
                    { label: "Last IP", value: user.lastLoginIp || "—", mono: true },
                    { label: "Joined", value: new Date(user.createdAt).toLocaleString() },
                  ].map((r) => (
                    <div key={r.label} className="flex items-start gap-3 py-2 border-b border-surface-3 last:border-0">
                      <span className="text-xs text-gray-500 w-28 flex-shrink-0">{r.label}</span>
                      <span className={`text-xs text-gray-300 flex-1 break-all ${r.mono ? "font-mono" : ""}`}>{r.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === "activity" && (
                activities.length === 0 ? (
                  <p className="text-center text-gray-600 text-sm py-8">No activity yet.</p>
                ) : (
                  <div className="space-y-2">
                    {activities.map((a) => (
                      <div key={a._id} className="flex items-start gap-2.5 py-1.5 border-b border-surface-3 last:border-0">
                        <div className="w-7 h-7 rounded-lg bg-surface-3 border border-surface-4 flex items-center justify-center flex-shrink-0">
                          <Activity size={11} className="text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-300 leading-snug">
                            <span className="font-medium text-white">{a.action}</span>
                            {(a.details?.filename || a.details?.originalName) && (
                              <span className="text-gray-400"> "{a.details.filename || a.details.originalName}"</span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(a.createdAt)} · {a.ip || "unknown IP"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === "files" && (
                files.length === 0 ? (
                  <p className="text-center text-gray-600 text-sm py-8">No files.</p>
                ) : (
                  <div className="space-y-2">
                    {files.map((f) => (
                      <div key={f._id} className="flex items-center gap-2.5 p-2 rounded-lg bg-surface-2 border border-surface-4">
                        <FileText size={14} className="text-gray-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-200 truncate">{f.originalName}</p>
                          <p className="text-[10px] text-gray-600 font-mono">{formatBytes(f.size)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  File Info Modal
// ─────────────────────────────────────────────────────────────────────────────
function FileInfoModal({ file, onClose, onDelete }) {
  if (!file) return null;
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[55] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-1 border border-surface-4 rounded-2xl p-5 max-w-md w-full shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-brand/15 border border-brand/25 flex items-center justify-center">
              <FileText size={16} className="text-brand-glow" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-sm">File Details</h3>
              <p className="text-[11px] text-gray-500 truncate max-w-[240px]">{file.originalName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>

        <div className="space-y-1">
          {[
            { label: "File ID", value: file._id, mono: true },
            { label: "Owner", value: file.owner?.username || file.owner?.email || "—" },
            { label: "Size", value: formatBytes(file.size) },
            { label: "Type", value: file.mimetype },
            { label: "Uploaded", value: new Date(file.createdAt).toLocaleString() },
            file.description && { label: "Description", value: file.description },
            file.tags?.length && { label: "Tags", value: file.tags.map((t) => `#${t}`).join("  ") },
            { label: "Scan Status", value: file.scanStatus || "pending" },
            { label: "Trash", value: file.isDeleted ? "Yes" : "No" },
          ].filter(Boolean).map((r) => (
            <div key={r.label} className="flex items-start gap-3 py-1.5 border-b border-surface-3 last:border-0">
              <span className="text-xs text-gray-500 w-24 flex-shrink-0">{r.label}</span>
              <span className={`text-xs text-gray-300 flex-1 break-all ${r.mono ? "font-mono" : ""}`}>{r.value}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t border-surface-3">
          <button onClick={onClose} className="btn-ghost flex-1">Close</button>
          <button
            onClick={() => { onDelete(file); onClose(); }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs bg-red-900/15 border border-red-900/30 text-accent-red hover:bg-red-900/30 flex-1"
          >
            <Trash2 size={12} /> Delete File
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab() {
  const { on, off } = useSocket();
  const socketRef = useRef({ on, off });
  useEffect(() => { socketRef.current = { on, off }; }, [on, off]);

  const [range, setRange] = useState("30d");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activityStats, setActivityStats] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get("/api/admin/stats"),
        api.get(`/api/analytics/overview?range=${range}`),
        api.get("/api/admin/users", { params: { limit: 5, sortBy: "createdAt", order: "desc" } }),
        api.get("/api/admin/activities", { params: { limit: 10 } }),
        api.get("/api/admin/activities/stats"),
        api.get("/api/workflows/pending-approvals"),
      ]);
      if (results[0].status === "fulfilled") setStats(results[0].value.data?.stats || null);
      if (results[1].status === "fulfilled") setAnalytics(results[1].value.data || null);
      if (results[2].status === "fulfilled") setRecentUsers(Array.isArray(results[2].value.data?.users) ? results[2].value.data.users : []);
      if (results[3].status === "fulfilled") setRecentActivities(Array.isArray(results[3].value.data?.activities) ? results[3].value.data.activities : []);
      if (results[4].status === "fulfilled") setActivityStats(results[4].value.data || null);
      if (results[5].status === "fulfilled") setPendingApprovals(Array.isArray(results[5].value.data?.workflows) ? results[5].value.data.workflows : []);
      setLastUpdated(new Date());
    } catch {
      toast.error("Failed to load admin overview.");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, [range]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") fetchAll(true);
    }, 30000);
    return () => clearInterval(t);
  }, [autoRefresh, fetchAll]);

  useEffect(() => {
    const handler = () => fetchAll(true);
    const { on: sOn, off: sOff } = socketRef.current;
    sOn("activity", handler);
    sOn("announcement", handler);
    return () => { sOff("activity", handler); sOff("announcement", handler); };
  }, [fetchAll]);

  const handleExport = () => {
    const payload = { exportedAt: new Date().toISOString(), range, stats, analytics, recentUsers, recentActivities, activityStats, pendingApprovals };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `vaultfs-admin-overview-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast.success("Overview exported.");
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-brand-glow" /></div>;
  if (!stats) return <div className="text-center py-16 text-gray-500 text-sm">No stats available.</div>;

  const healthChecks = [
    { label: "No banned users", passed: (stats.users?.banned || 0) === 0, weight: 20 },
    { label: "No pending approvals", passed: pendingApprovals.length === 0, weight: 25 },
    { label: "Storage under 80%", passed: (stats.files?.totalSize || 0) < 0.8 * 100 * 1024 * 1024 * 1024, weight: 20 },
    { label: "Users active", passed: (analytics?.activeUsers?.value || 0) > 0, weight: 35 },
  ];
  const healthScore = healthChecks.reduce((s, c) => s + (c.passed ? c.weight : 0), 0);
  const healthColor = healthScore >= 80 ? "#34d399" : healthScore >= 50 ? "#f59e0b" : "#ef4444";

  const uploadTrendData = Array.isArray(stats.uploadTrend) ? stats.uploadTrend.map((d) => ({ date: d._id, count: d.count })) : [];
  const fileTypesData = Array.isArray(stats.fileTypeBreakdown) ? stats.fileTypeBreakdown.slice(0, 7).map((t, i) => ({
    name: t._id || "other", value: t.count, color: FILE_TYPE_COLORS[i % FILE_TYPE_COLORS.length],
  })) : [];
  const storageByUser = Array.isArray(stats.topUploaders) ? stats.topUploaders.slice(0, 6).map((u) => ({
    name: (u.user?.username || "unknown").slice(0, 10), bytes: u.totalSize,
  })) : [];
  const activityTrendData = Array.isArray(activityStats?.byDay) ? activityStats.byDay.slice(-14).map((d) => ({ date: d._id, count: d.count })) : [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 bg-surface-2 border border-surface-4 rounded-xl p-1">
          {RANGE_OPTIONS.map((r) => (
            <button key={r.id} onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                range === r.id ? "bg-surface-1 text-white border border-surface-4 shadow-sm" : "text-gray-500 hover:text-gray-300"}`}>
              {r.label}
            </button>
          ))}
        </div>
        <button onClick={() => setAutoRefresh((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${
            autoRefresh ? "bg-emerald-900/15 border-emerald-900/30 text-emerald-400" : "btn-ghost"}`}>
          {autoRefresh ? <Radio size={11} className="animate-pulse" /> : <Pause size={11} />}
          {autoRefresh ? "Live" : "Paused"}
        </button>
        <button onClick={() => fetchAll(true)} disabled={refreshing} className="btn-ghost px-3 py-1.5 text-xs">
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
        </button>
        <button onClick={handleExport} className="btn-ghost px-3 py-1.5 text-xs">
          <Download size={12} /> Export
        </button>
        {lastUpdated && (
          <span className="ml-auto text-[11px] text-gray-600 flex items-center gap-1.5">
            <Clock size={10} /> Updated {timeAgo(lastUpdated)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Total Users" value={stats.users?.total ?? 0}
          sub={`${stats.users?.active ?? 0} active · ${stats.users?.banned ?? 0} banned`} trend={analytics?.activeUsers?.change} />
        <StatCard icon={CheckCircle2} label="Verified" value={stats.users?.verified ?? 0}
          color="text-emerald-400" bg="bg-emerald-900/10 border-emerald-900/20"
          sub={`${Math.round(((stats.users?.verified || 0) / (stats.users?.total || 1)) * 100)}%`} />
        <StatCard icon={FileText} label="Total Files" value={(stats.files?.total || 0).toLocaleString()}
          sub={formatBytes(stats.files?.totalSize || 0)} trend={analytics?.totalFiles?.change} />
        <StatCard icon={Trash2} label="In Trash" value={stats.files?.trash ?? 0}
          color="text-accent-red" bg="bg-red-900/10 border-red-900/20" />
        <StatCard icon={Activity} label="Active Users" value={analytics?.activeUsers?.value ?? 0}
          sub={analytics?.periodLabel || "in range"}
          color="text-purple-400" bg="bg-purple-900/10 border-purple-900/20" />
        <StatCard icon={ShieldAlert} label="Security Alerts" value={analytics?.securityAlerts?.value ?? 0}
          sub="Suspicious devices"
          color={analytics?.securityAlerts?.value > 0 ? "text-accent-red" : "text-gray-500"}
          bg={analytics?.securityAlerts?.value > 0 ? "bg-red-900/10 border-red-900/20" : "bg-surface-3 border-surface-4"} />
      </div>

      {pendingApprovals.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-900/10 border border-amber-900/25">
          <div className="w-8 h-8 rounded-lg bg-amber-900/20 border border-amber-900/30 flex items-center justify-center flex-shrink-0">
            <Zap size={15} className="text-accent-amber" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-200">{pendingApprovals.length} workflow{pendingApprovals.length !== 1 ? "s" : ""} awaiting approval</p>
            <p className="text-xs text-amber-300/60 mt-0.5 truncate">
              {pendingApprovals.slice(0, 3).map((w) => w.name).join(", ")}{pendingApprovals.length > 3 && ` +${pendingApprovals.length - 3} more`}
            </p>
          </div>
          <a href="/admin/workflows" className="flex-shrink-0 text-xs text-amber-300 hover:text-amber-100 underline">Review →</a>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="card p-5 flex flex-col items-center">
          <h3 className="font-display font-semibold text-white text-sm mb-3 self-start flex items-center gap-2">
            <Gauge size={14} className="text-brand-glow" /> System Health
          </h3>
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#27272a" strokeWidth="8" />
              <circle cx="50" cy="50" r="44" fill="none" stroke={healthColor} strokeWidth="8" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 44}
                strokeDashoffset={2 * Math.PI * 44 * (1 - healthScore / 100)}
                style={{ transition: "stroke-dashoffset 0.8s ease" }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-display font-bold text-white font-mono leading-none">{healthScore}</span>
              <span className="text-[10px] text-gray-500 mt-0.5">/ 100</span>
            </div>
          </div>
          <div className="w-full mt-4 space-y-1.5">
            {healthChecks.map((c) => (
              <div key={c.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {c.passed ? <CheckCircle2 size={11} className="text-emerald-400" /> : <XCircle size={11} className="text-gray-600" />}
                  <span className={c.passed ? "text-gray-300" : "text-gray-500"}>{c.label}</span>
                </div>
                <span className={`font-mono text-[10px] ${c.passed ? "text-emerald-400" : "text-gray-600"}`}>+{c.weight}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
              <TrendingUp size={14} className="text-brand-glow" /> Upload Trend — {RANGE_OPTIONS.find((r) => r.id === range)?.label}
            </h3>
          </div>
          {uploadTrendData.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-12">No uploads in this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={uploadTrendData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="adminUploadGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.55} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  interval={Math.max(0, Math.floor(uploadTrendData.length / 6))} />
                <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartTooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#a78bfa" strokeWidth={2} fill="url(#adminUploadGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2">
            <Database size={14} className="text-brand-glow" /> File Types
          </h3>
          {fileTypesData.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-8">No files yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={fileTypesData} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={2} stroke="none">
                    {fileTypesData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <RechartTooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {fileTypesData.map((t) => (
                  <div key={t.name} className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                      <span className="text-gray-300 capitalize truncate">{t.name}</span>
                    </div>
                    <span className="text-gray-500 font-mono flex-shrink-0">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2">
            <Users2 size={14} className="text-brand-glow" /> Storage by User
          </h3>
          {storageByUser.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-8">No uploaders yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={storageByUser} layout="vertical" margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatBytes} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} tickLine={false} axisLine={false} width={70} />
                <RechartTooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} formatter={(v) => [formatBytes(v), "Storage"]} />
                <Bar dataKey="bytes" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-3 flex items-center gap-2">
            <Activity size={14} className="text-brand-glow" /> Recent Activity
          </h3>
          {recentActivities.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-8">No recent activity.</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {recentActivities.slice(0, 8).map((a) => (
                <div key={a._id} className="flex items-start gap-2.5 py-1">
                  <div className="w-7 h-7 rounded-lg bg-surface-3 border border-surface-4 flex items-center justify-center flex-shrink-0">
                    <Activity size={11} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 leading-snug">
                      <span className="font-medium text-white">{a.user?.displayName || a.user?.username || "System"}</span>{" "}
                      <span className="text-gray-500">{a.action}</span>
                      {(a.details?.filename || a.details?.originalName) && (
                        <span className="text-gray-400"> "{a.details.filename || a.details.originalName}"</span>
                      )}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(a.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-3 flex items-center gap-2">
            <Users size={14} className="text-brand-glow" /> Recent Signups
          </h3>
          {recentUsers.length === 0 ? (
            <p className="text-center text-gray-600 text-sm py-8">No users yet.</p>
          ) : (
            <div className="space-y-2">
              {recentUsers.map((u) => (
                <div key={u._id} className="flex items-center gap-2.5 py-1.5 border-b border-surface-3 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-brand/15 border border-brand/25 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-brand-glow">{(u.displayName || u.username)?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-200 truncate">{u.displayName || u.username}</p>
                    <p className="text-[10px] text-gray-600 truncate">{u.email}</p>
                  </div>
                  <span className="text-[10px] text-gray-600 flex-shrink-0">{timeAgo(u.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {activityTrendData.length > 0 && (
        <div className="card p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-glow" /> Platform Activity — Last 14 Days
          </h3>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={activityTrendData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="adminActGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <RechartTooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} fill="url(#adminActGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  USER MANAGEMENT TAB
// ─────────────────────────────────────────────────────────────────────────────
function UserManagementTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ role: "", status: "" });
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [drawerUserId, setDrawerUserId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [actionUser, setActionUser] = useState(null);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "user" });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/admin/users", {
        params: { page, limit: 20, search, ...filter, sortBy, order: sortOrder },
      });
      setUsers(Array.isArray(data?.users) ? data.users : []);
      setPages(data?.pagination?.pages ?? 1);
      setTotal(data?.pagination?.total ?? 0);
    } catch { toast.error("Failed to load users."); }
    finally { setLoading(false); }
  }, [page, search, filter, sortBy, sortOrder]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortOrder("asc"); }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    setSelectedIds((prev) => prev.size === users.length ? new Set() : new Set(users.map((u) => u._id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const bulkAction = async (action) => {
    if (!selectedIds.size) return;
    let count = 0;
    for (const id of [...selectedIds]) {
      try {
        if (action === "ban") await api.post(`/api/admin/users/${id}/ban`, { reason: "Bulk action by admin" });
        else if (action === "unban") await api.post(`/api/admin/users/${id}/unban`);
        else if (action === "delete") await api.delete(`/api/admin/users/${id}`);
        else if (action === "reset") await api.post(`/api/admin/users/${id}/force-reset`);
        count++;
      } catch {}
    }
    toast.success(`${count} user(s) updated.`);
    clearSelection(); fetchUsers();
  };

  const handleBan = async () => {
    try {
      await api.post(`/api/admin/users/${actionUser._id}/ban`, {
        reason: banReason || undefined,
        duration: banDuration ? parseInt(banDuration) : undefined,
      });
      toast.success(`${actionUser.username} banned.`);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || "Ban failed."); }
    setActionUser(null); setBanReason(""); setBanDuration("");
  };

  const handleUnban = async (user) => {
    try { await api.post(`/api/admin/users/${user._id}/unban`); toast.success(`${user.username} unbanned.`); fetchUsers(); }
    catch { toast.error("Unban failed."); }
  };

  const handleForceReset = async (user) => {
    try { await api.post(`/api/admin/users/${user._id}/force-reset`); toast.success(`Password reset email sent to ${user.email}.`); }
    catch { toast.error("Failed."); }
  };

  const handleDelete = async (user) => {
    try { await api.delete(`/api/admin/users/${user._id}`); toast.success(`User "${user.username}" deleted.`); fetchUsers(); }
    catch (err) { toast.error(err.response?.data?.message || "Delete failed."); }
  };

  const handleImpersonate = async (user) => {
    try {
      const { data } = await api.post(`/api/admin/users/${user._id}/impersonate`);
      localStorage.setItem("impersonating_token", localStorage.getItem("token"));
      localStorage.setItem("token", data.token);
      toast.success(`Impersonating ${user.username}.`);
      window.location.href = "/dashboard";
    } catch (err) { toast.error(err.response?.data?.message || "Impersonate failed."); }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) return toast.error("All fields are required.");
    setCreating(true);
    try {
      await api.post("/api/admin/users/create", newUser);
      toast.success(`User "${newUser.username}" created.`);
      setNewUser({ username: "", email: "", password: "", role: "user" });
      setCreating(false); fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || "Create failed."); setCreating(false); }
  };

  const exportCSV = async () => {
    try {
      const response = await api.get("/api/admin/users/export", { responseType: "blob" });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `vaultfs-users-${Date.now()}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV exported.");
    } catch { toast.error("Export failed."); }
  };

  const drawerAction = (action, user) => {
    if (action === "ban") { setActionUser(user); setDrawerUserId(null); }
    else if (action === "unban") handleUnban(user);
    else if (action === "reset") handleForceReset(user);
    else if (action === "impersonate") handleImpersonate(user);
  };

  const allSelected = users.length > 0 && selectedIds.size === users.length;

  return (
    <div className="space-y-4">
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
      {drawerUserId && <UserDetailDrawer userId={drawerUserId} onClose={() => setDrawerUserId(null)} onAction={drawerAction} />}

      {actionUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setActionUser(null)}>
          <div className="bg-surface-1 border border-surface-4 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-white mb-4">Ban {actionUser.username}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Reason</label>
                <input className="input" placeholder="Violated ToS…" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Duration (hours, empty = permanent)</label>
                <input type="number" className="input" placeholder="e.g. 72" value={banDuration} onChange={(e) => setBanDuration(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setActionUser(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleBan} className="flex-1 justify-center font-semibold rounded-lg px-4 py-2 text-sm bg-accent-red/15 text-accent-red border border-red-900/40 hover:bg-accent-red/25 transition-all flex items-center gap-2">
                <Ban size={13} /> Ban User
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input pl-8 text-sm" placeholder="Search users…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input text-sm w-32" value={filter.role} onChange={(e) => setFilter((p) => ({ ...p, role: e.target.value }))}>
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select className="input text-sm w-36" value={filter.status} onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
        <button onClick={fetchUsers} className="btn-ghost px-3 py-2"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></button>
        <button onClick={exportCSV} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5"><Download size={12} /> Export CSV</button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleCreateUser(); }} className="card p-4 border-dashed">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Create User</p>
        <div className="grid sm:grid-cols-4 gap-2">
          <input className="input text-sm" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))} />
          <input className="input text-sm" placeholder="Email" type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
          <input className="input text-sm" placeholder="Password" type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
          <div className="flex gap-2">
            <select className="input text-sm flex-1" value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={creating} className="btn-primary px-4 py-2 text-sm">{creating ? <Loader2 size={13} className="animate-spin" /> : "+"}</button>
          </div>
        </div>
      </form>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-3 bg-brand/5 border border-brand/15 rounded-xl animate-fade-up">
          <span className="text-xs font-medium text-gray-300">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button onClick={() => bulkAction("ban")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-900/15 border border-red-900/30 text-accent-red hover:bg-red-900/30">
            <Ban size={11} /> Ban
          </button>
          <button onClick={() => bulkAction("unban")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-emerald-900/20 border border-emerald-900/30 text-emerald-400 hover:bg-emerald-900/30">
            <UserCheck size={11} /> Unban
          </button>
          <button onClick={() => bulkAction("reset")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-amber-900/15 border border-amber-900/30 text-amber-400 hover:bg-amber-900/30">
            <Key size={11} /> Reset
          </button>
          <button
            onClick={() => setConfirm({
              title: "Bulk Delete",
              message: `Permanently delete ${selectedIds.size} user(s) and ALL their files?`,
              confirmLabel: "Delete Forever",
              onConfirm: () => bulkAction("delete"),
            })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-900/15 border border-red-900/30 text-accent-red hover:bg-red-900/30">
            <Trash2 size={11} /> Delete
          </button>
          <button onClick={clearSelection} className="btn-ghost text-xs px-2.5 py-1.5"><X size={12} /></button>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
          <p className="text-xs text-gray-500">{total} user{total !== 1 ? "s" : ""}</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-brand-glow" /></div>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-10">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 border-b border-surface-3">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <button onClick={toggleSelectAll} className="text-gray-500 hover:text-white">
                      {allSelected ? <CheckSquare size={14} className="text-brand-glow" /> : <Square size={14} />}
                    </button>
                  </th>
                  <SortableTh label="User" field="username" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableTh label="Email" field="email" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableTh label="Role" field="role" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableTh label="Storage" field="storageUsed" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <SortableTh label="Files" field="fileCount" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <SortableTh label="Joined" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-3">
                {users.map((u) => {
                  const selected = selectedIds.has(u._id);
                  return (
                    <tr key={u._id} className={`hover:bg-surface-2 transition-colors group ${selected ? "bg-brand/5" : ""}`}>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleSelect(u._id)} className="text-gray-500 hover:text-brand-glow">
                          {selected ? <CheckSquare size={14} className="text-brand-glow" /> : <Square size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 cursor-pointer" onClick={() => setDrawerUserId(u._id)}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-brand/15 border border-brand/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[11px] font-bold text-brand-glow">{(u.displayName || u.username)?.[0]?.toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-200 text-xs">{u.displayName || u.username}</p>
                            <p className="text-[10px] text-gray-600">@{u.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono">{u.email}</td>
                      <td className="px-4 py-3"><Badge variant={u.role === "admin" ? "admin" : "default"}>{u.role}</Badge></td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{formatBytes(u.storageUsed)} / {formatBytes(u.storageLimit)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{u.fileCount || 0}</td>
                      <td className="px-4 py-3">
                        {u.isBanned ? <Badge variant="banned">Banned</Badge> : u.emailVerified ? <Badge variant="active">Verified</Badge> : <Badge>Unverified</Badge>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setDrawerUserId(u._id)} title="View details" className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-surface-3">
                            <Eye size={13} />
                          </button>
                          {u.isBanned ? (
                            <button onClick={() => handleUnban(u)} title="Unban" className="p-1.5 rounded text-emerald-500 hover:bg-emerald-900/20">
                              <UserCheck size={13} />
                            </button>
                          ) : (
                            <button onClick={() => setActionUser(u)} title="Ban" className="p-1.5 rounded text-accent-red hover:bg-red-900/20">
                              <Ban size={13} />
                            </button>
                          )}
                          <button onClick={() => handleForceReset(u)} title="Force Reset" className="p-1.5 rounded text-amber-400 hover:bg-amber-900/20">
                            <Key size={13} />
                          </button>
                          <button onClick={() => handleImpersonate(u)} title="Impersonate" className="p-1.5 rounded text-brand-glow hover:bg-brand/10">
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => setConfirm({
                              title: "Delete User",
                              message: `Permanently delete "${u.username}" and ALL their files?`,
                              confirmLabel: "Delete Forever",
                              onConfirm: () => handleDelete(u),
                            })}
                            className="p-1.5 rounded text-gray-600 hover:text-accent-red hover:bg-red-900/10">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-sm px-3 py-2">Previous</button>
          <span className="text-sm text-gray-500 font-mono">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn-ghost text-sm px-3 py-2">Next</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  FILE OVERSIGHT TAB
// ─────────────────────────────────────────────────────────────────────────────
function FileOversightTab() {
  const [activeView, setActiveView] = useState("all");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewFile, setPreviewFile] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      let data;
      if (activeView === "all") {
        ({ data } = await api.get("/api/admin/files", { params: { page, limit: 25, search, sortBy, order: sortOrder } }));
      } else if (activeView === "search" && search) {
        ({ data } = await api.get("/api/admin/files/search", { params: { q: search, page, limit: 25 } }));
      } else if (activeView === "hogs") {
        ({ data } = await api.get("/api/admin/files/storage-hogs"));
      } else if (activeView === "orphaned") {
        ({ data } = await api.get("/api/admin/files/orphaned"));
      }
      if (data) {
        setFiles(Array.isArray(data.files) ? data.files : []);
        setPages(data.pagination?.pages ?? 1);
        setTotal(data.pagination?.total ?? data.count ?? 0);
      }
    } catch { toast.error("Failed to load files."); }
    finally { setLoading(false); }
  }, [activeView, page, search, sortBy, sortOrder]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleSort = (field) => {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortOrder("asc"); }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    setSelectedIds((prev) => prev.size === files.length ? new Set() : new Set(files.map((f) => f._id)));
  };
  const clearSelection = () => setSelectedIds(new Set());

  const handleDelete = async (file) => {
    try { await api.delete(`/api/admin/files/${file._id}`); toast.success("File deleted."); fetchFiles(); }
    catch { toast.error("Delete failed."); }
  };

  const bulkDelete = async () => {
    if (!selectedIds.size) return;
    let count = 0;
    for (const id of [...selectedIds]) {
      try { await api.delete(`/api/admin/files/${id}`); count++; } catch {}
    }
    toast.success(`${count} file(s) deleted.`);
    clearSelection(); fetchFiles();
  };

  const cleanupOrphaned = async () => {
    try { const { data } = await api.post("/api/admin/files/orphaned/cleanup"); toast.success(data.message); fetchFiles(); }
    catch { toast.error("Cleanup failed."); }
  };

  const VIEWS = [
    { id: "all", label: "All Files" },
    { id: "hogs", label: "Storage Hogs" },
    { id: "orphaned", label: "Orphaned" },
    { id: "search", label: "Full-Text Search" },
  ];

  const allSelected = files.length > 0 && selectedIds.size === files.length;

  return (
    <div className="space-y-4">
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}
      {previewFile && <FileInfoModal file={previewFile} onClose={() => setPreviewFile(null)} onDelete={handleDelete} />}

      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button key={v.id} onClick={() => { setActiveView(v.id); setPage(1); clearSelection(); }}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${activeView === v.id ? "bg-brand/15 border-brand/30 text-brand-glow" : "btn-ghost"}`}>
            {v.label}
          </button>
        ))}
        {(activeView === "all" || activeView === "search") && (
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input className="input pl-8 text-sm" placeholder="Search file names, tags…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        )}
        {activeView === "orphaned" && files.length > 0 && (
          <button onClick={() => setConfirm({ title: "Cleanup Orphaned Files", message: `Remove ${files.length} orphaned file(s)?`, confirmLabel: "Cleanup", onConfirm: cleanupOrphaned })} className="btn-ghost text-xs text-accent-red px-3 py-2 flex items-center gap-1.5">
            <Trash2 size={12} /> Cleanup All
          </button>
        )}
        <button onClick={fetchFiles} className="btn-ghost px-3 py-2"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-3 bg-brand/5 border border-brand/15 rounded-xl animate-fade-up">
          <span className="text-xs font-medium text-gray-300">{selectedIds.size} selected</span>
          <div className="flex-1" />
          <button
            onClick={() => setConfirm({
              title: "Bulk Delete Files",
              message: `Permanently delete ${selectedIds.size} file(s)?`,
              confirmLabel: "Delete Forever",
              onConfirm: bulkDelete,
            })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-red-900/15 border border-red-900/30 text-accent-red hover:bg-red-900/30">
            <Trash2 size={11} /> Delete
          </button>
          <button onClick={clearSelection} className="btn-ghost text-xs px-2.5 py-1.5"><X size={12} /></button>
        </div>
      )}

      <p className="text-xs text-gray-600">{total.toLocaleString()} file{total !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-brand-glow" /></div>
      ) : files.length === 0 ? (
        <div className="card p-16 text-center"><FileText size={32} className="text-gray-600 mx-auto mb-3" /><p className="text-gray-400">No files found.</p></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 border-b border-surface-3">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <button onClick={toggleSelectAll} className="text-gray-500 hover:text-white">
                      {allSelected ? <CheckSquare size={14} className="text-brand-glow" /> : <Square size={14} />}
                    </button>
                  </th>
                  <SortableTh label="Filename" field="originalName" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Owner</th>
                  <SortableTh label="Size" field="size" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <SortableTh label="Uploaded" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-3">
                {files.map((f) => {
                  const selected = selectedIds.has(f._id);
                  return (
                    <tr key={f._id} className={`hover:bg-surface-2 transition-colors group ${selected ? "bg-brand/5" : ""}`}>
                      <td className="px-3 py-3">
                        <button onClick={() => toggleSelect(f._id)} className="text-gray-500 hover:text-brand-glow">
                          {selected ? <CheckSquare size={14} className="text-brand-glow" /> : <Square size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-3 max-w-[240px] cursor-pointer" onClick={() => setPreviewFile(f)}>
                        <p className="text-xs font-medium text-gray-200 truncate" title={f.originalName}>{f.originalName}</p>
                        {f.tags?.length > 0 && (<p className="text-[10px] text-gray-600 truncate">{f.tags.slice(0, 3).map(t => `#${t}`).join(" ")}</p>)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{f.owner?.username || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">{formatBytes(f.size)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{f.mimetype?.split("/")[1] || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{new Date(f.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setPreviewFile(f)} title="View details" className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-surface-3">
                            <Eye size={13} />
                          </button>
                          <button
                            onClick={() => setConfirm({ title: "Delete File", message: `Permanently delete "${f.originalName}"?`, confirmLabel: "Delete", onConfirm: () => handleDelete(f) })}
                            className="p-1.5 rounded text-gray-600 hover:text-accent-red hover:bg-red-900/10">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-sm px-3 py-2">Previous</button>
          <span className="text-sm text-gray-500 font-mono">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn-ghost text-sm px-3 py-2">Next</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ACTIVITY META
// ─────────────────────────────────────────────────────────────────────────────
const ACTION_META = {
  login: { label: "Login", icon: "🔑", color: "text-emerald-400" },
  logout: { label: "Logout", icon: "🚪", color: "text-gray-400" },
  register: { label: "Register", icon: "🆕", color: "text-brand-glow" },
  upload: { label: "Upload", icon: "⬆️", color: "text-brand-glow" },
  download: { label: "Download", icon: "⬇️", color: "text-blue-400" },
  delete: { label: "Delete", icon: "🗑️", color: "text-accent-red" },
  restore: { label: "Restore", icon: "♻️", color: "text-amber-400" },
  share: { label: "Share", icon: "🔗", color: "text-purple-400" },
  unshare: { label: "Unshare", icon: "🔒", color: "text-gray-400" },
  star: { label: "Star", icon: "⭐", color: "text-amber-400" },
  unstar: { label: "Unstar", icon: "☆", color: "text-gray-400" },
  rename: { label: "Rename", icon: "✏️", color: "text-blue-400" },
  bulk_delete: { label: "Bulk Delete", icon: "🗑️", color: "text-accent-red" },
  password_change: { label: "Pwd Change", icon: "🔐", color: "text-amber-400" },
  settings_update: { label: "Settings", icon: "⚙️", color: "text-gray-400" },
  profile_update: { label: "Profile", icon: "👤", color: "text-blue-400" },
  "2fa_enable": { label: "2FA On", icon: "🛡️", color: "text-emerald-400" },
  "2fa_disable": { label: "2FA Off", icon: "🛡️", color: "text-accent-red" },
  file_request_create: { label: "File Req", icon: "📋", color: "text-brand-glow" },
  file_request_submit: { label: "Req Submit", icon: "📩", color: "text-purple-400" },
  team_invite: { label: "Team Invite", icon: "👥", color: "text-emerald-400" },
  team_remove: { label: "Team Remove", icon: "👥", color: "text-accent-red" },
};

// ─────────────────────────────────────────────────────────────────────────────
//  SYSTEM ACTIVITY TAB (defensive + fixed)
// ─────────────────────────────────────────────────────────────────────────────
function SystemActivityTab() {
  const { on, off } = useSocket();
  const socketRef = useRef({ on, off });
  useEffect(() => { socketRef.current = { on, off }; }, [on, off]);

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(true);
  const [live, setLive] = useState(false);

  const [filterAction, setFilterAction] = useState("");
  const [filterUser, setFilterUser] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [search, setSearch] = useState("");

  const fetchActivities = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (filterAction) params.action = filterAction;
      if (filterUser) params.userId = filterUser;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo) params.dateTo = filterDateTo;
      if (search) params.search = search;
      const { data } = await api.get("/api/admin/activities", { params });
      setActivities(Array.isArray(data?.activities) ? data.activities : []);
      setPages(data?.pagination?.pages ?? 1);
      setTotal(data?.pagination?.total ?? 0);
    } catch {
      if (!silent) toast.error("Failed to load activity log.");
      setActivities([]); setPages(1); setTotal(0);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, filterAction, filterUser, filterDateFrom, filterDateTo, search]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("/api/admin/activities/stats");
      setStats({
        byAction: Array.isArray(data?.byAction) ? data.byAction : [],
        byDay: Array.isArray(data?.byDay) ? data.byDay : [],
        topUsers: Array.isArray(data?.topUsers) ? data.topUsers : [],
      });
    } catch {
      setStats({ byAction: [], byDay: [], topUsers: [] });
    }
  }, []);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") fetchActivities(true);
    }, 15000);
    return () => clearInterval(t);
  }, [live, fetchActivities]);

  useEffect(() => {
    const handler = () => { if (live) fetchActivities(true); };
    const { on: sOn, off: sOff } = socketRef.current;
    sOn("activity", handler);
    return () => sOff("activity", handler);
  }, [live, fetchActivities]);

  const clearFilters = () => {
    setFilterAction(""); setFilterUser(""); setFilterDateFrom(""); setFilterDateTo(""); setSearch(""); setPage(1);
  };
  const hasFilters = filterAction || filterUser || filterDateFrom || filterDateTo || search;

  const exportCSV = () => {
    if (!activities.length) return toast.error("No data to export.");
    const headers = ["Timestamp", "User", "Email", "Action", "Details", "IP"];
    const escape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = activities.map((a) => [
      a.createdAt,
      a.user?.username || "",
      a.user?.email || "",
      a.action,
      JSON.stringify(a.details || {}),
      a.ip || "",
    ].map(escape).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `vaultfs-activity-${Date.now()}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${activities.length} event(s).`);
  };

  return (
    <div className="space-y-4">
      {showStats && stats && stats.byAction.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.byAction.slice(0, 4).map((a) => {
            const meta = ACTION_META[a._id] || { label: a._id, icon: "📌", color: "text-gray-400" };
            return (
              <div key={a._id} className="card p-3 flex items-center gap-3 cursor-pointer hover:border-brand/30 transition-colors" onClick={() => { setFilterAction(a._id); setPage(1); }}>
                <span className="text-xl">{meta.icon}</span>
                <div>
                  <p className="text-xs text-gray-500">{meta.label}</p>
                  <p className="text-lg font-bold text-white font-mono">{(a.count || 0).toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showStats && stats && stats.byDay.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Activity size={12} className="text-brand-glow" /> Activity — Last 30 Days ({total.toLocaleString()} total)
            </h3>
            <button onClick={() => setShowStats(false)} className="text-xs text-gray-600 hover:text-gray-400">Hide charts</button>
          </div>
          <div className="flex items-end gap-0.5 h-16">
            {stats.byDay.map((d) => {
              const max = Math.max(...stats.byDay.map((x) => x.count), 1);
              const pct = Math.round(((d.count || 0) / max) * 100);
              return (
                <div key={d._id} className="flex-1 group relative" title={`${d._id}: ${d.count}`}>
                  <div className="w-full bg-brand/40 hover:bg-brand/70 rounded-sm transition-all cursor-default" style={{ height: `${Math.max(pct, 4)}%` }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input className="input pl-8 text-sm" placeholder="Search by filename, IP…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select className="input text-sm w-36" value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}>
          <option value="">All Actions</option>
          {Object.entries(ACTION_META).map(([k, v]) => (<option key={k} value={k}>{v.icon} {v.label}</option>))}
        </select>
        <input type="date" className="input text-sm w-36" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }} title="From date" />
        <input type="date" className="input text-sm w-36" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }} title="To date" />
        <button onClick={() => setLive((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs border transition-all ${
            live ? "bg-emerald-900/15 border-emerald-900/30 text-emerald-400" : "btn-ghost"}`}>
          {live ? <Radio size={11} className="animate-pulse" /> : <Pause size={11} />}
          {live ? "Live" : "Paused"}
        </button>
        <button onClick={() => { fetchActivities(); fetchStats(); }} className="btn-ghost px-3 py-2" title="Refresh"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></button>
        <button onClick={exportCSV} disabled={!activities.length} className="btn-ghost px-3 py-2 text-xs flex items-center gap-1.5"><Download size={12} /> CSV</button>
        {hasFilters && (<button onClick={clearFilters} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5 text-accent-red"><X size={12} /> Clear</button>)}
        {!showStats && (<button onClick={() => setShowStats(true)} className="btn-ghost text-xs px-3 py-2">Show charts</button>)}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-3 bg-surface-2">
          <p className="text-xs text-gray-500 font-mono">{total.toLocaleString()} event{total !== 1 ? "s" : ""}{hasFilters && <span className="ml-2 text-brand-glow">(filtered)</span>}</p>
          <p className="text-xs text-gray-600">Page {page} / {pages || 1}</p>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-brand-glow" /></div>
        ) : activities.length === 0 ? (
          <div className="text-center py-14">
            <Activity size={28} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">No activity found.</p>
            {hasFilters && (<button onClick={clearFilters} className="mt-2 text-xs text-brand-glow hover:underline">Clear filters</button>)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/50">
                <tr>
                  {["Timestamp", "User", "Action", "Details", "IP"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => {
                  const meta = ACTION_META[a.action] || { label: a.action, icon: "📌", color: "text-gray-400" };
                  const user = a.user;
                  const det = a.details || {};
                  const detailStr = det.filename || det.originalName
                    ? `${det.filename || det.originalName}${det.size ? ` (${formatBytes(det.size)})` : ""}`
                    : det.email || "";
                  return (
                    <tr key={a._id} className="hover:bg-surface-2 transition-colors border-b border-surface-3/50">
                      <td className="px-4 py-2.5 text-[11px] text-gray-500 font-mono whitespace-nowrap">{formatDate(a.createdAt)}</td>
                      <td className="px-4 py-2.5">
                        {user ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-brand/15 border border-brand/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-[9px] font-bold text-brand-glow">{(user.displayName || user.username || "?")?.[0]?.toUpperCase()}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-gray-200 truncate max-w-[120px]">{user.displayName || user.username || "Unknown"}</p>
                              <p className="text-[10px] text-gray-600 truncate max-w-[120px]">{user.email || "—"}</p>
                            </div>
                          </div>
                        ) : (<span className="text-xs text-gray-600 italic">Deleted user</span>)}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${meta.color}`}>
                          <span>{meta.icon}</span>{meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[200px] truncate" title={detailStr}>{detailStr || <span className="text-gray-700 italic">—</span>}</td>
                      <td className="px-4 py-2.5 text-[11px] text-gray-600 font-mono whitespace-nowrap">{a.ip || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-sm px-3 py-2 disabled:opacity-40">Previous</button>
          <span className="text-sm text-gray-500 font-mono">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn-ghost text-sm px-3 py-2 disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANNOUNCEMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function AnnouncementsTab() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendEmail, setSendEmail] = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [items, setItems] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [removingId, setRemovingId] = useState("");

  const fetchAnnouncements = useCallback(async () => {
    setListLoading(true);
    try { const { data } = await api.get("/api/admin/announcements"); setItems(Array.isArray(data?.announcements) ? data.announcements : []); }
    catch { toast.error("Failed to load announcements."); }
    finally { setListLoading(false); }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleSend = async () => {
    if (!message.trim()) return toast.error("Message cannot be empty.");
    setLoading(true);
    try {
      const { data } = await api.post("/api/admin/announce", { subject, message, sendEmail, targetRole: targetRole || undefined });
      toast.success(data.message);
      setSent(true); setMessage(""); setSubject("");
      if (data.announcement) setItems((prev) => [data.announcement, ...prev].slice(0, 20));
      setTimeout(() => setSent(false), 3000);
    } catch { toast.error("Broadcast failed."); } finally { setLoading(false); }
  };

  const handleRemove = async (id) => {
    setRemovingId(id);
    try {
      await api.delete(`/api/admin/announcements/${id}`);
      setItems((prev) => prev.filter((item) => item._id !== id));
      toast.success("Announcement removed.");
    } catch (err) { toast.error(err.response?.data?.message || "Failed to remove announcement."); }
    finally { setRemovingId(""); }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="card p-5 space-y-4">
        <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
          <Megaphone size={14} className="text-brand-glow" /> Broadcast Announcement
        </h3>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Subject (for email)</label>
          <input className="input" placeholder="e.g. Scheduled maintenance" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Message *</label>
          <textarea className="input resize-none" rows={5} placeholder="Write your announcement here…" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Target Audience</label>
            <select className="input text-sm" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
              <option value="">All Users</option>
              <option value="user">Regular Users</option>
              <option value="admin">Admins Only</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-5">
            <span className="text-sm text-gray-400 cursor-pointer select-none" onClick={() => setSendEmail((p) => !p)}>Also send via email</span>
            <button type="button" role="switch" aria-checked={!!sendEmail} onClick={() => setSendEmail((p) => !p)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${sendEmail ? "bg-brand" : "bg-surface-4"}`}>
              <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${sendEmail ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-surface-2 rounded-lg border border-surface-4 text-xs text-gray-500">
          <AlertTriangle size={12} className="text-accent-amber mt-0.5 flex-shrink-0" />
          In-app announcement is sent instantly via WebSocket. Email delivery may take a moment.
        </div>
        <button onClick={handleSend} disabled={loading || !message.trim()} className="btn-primary flex items-center gap-2 px-5 py-2.5">
          {loading ? <Loader2 size={14} className="animate-spin" /> : sent ? <CheckCircle2 size={14} /> : <Send size={14} />}
          {loading ? "Sending…" : sent ? "Sent!" : "Send Announcement"}
        </button>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-white text-sm">Active Announcements</h3>
            <p className="text-xs text-gray-500 mt-1">Only admins can remove announcements after they are published.</p>
          </div>
          <button onClick={fetchAnnouncements} className="btn-ghost px-3 py-2" title="Refresh announcements">
            <RefreshCw size={13} className={listLoading ? "animate-spin" : ""} />
          </button>
        </div>
        {listLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-brand-glow" /></div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-4 bg-surface-2/50 p-5 text-sm text-gray-500">No active announcements right now.</div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="rounded-xl border border-surface-4 bg-surface-2/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">{item.subject || "System Announcement"}</p>
                      <Badge variant="brand">{item.targetRole === "admin" ? "Admins Only" : item.targetRole === "user" ? "Regular Users" : "All Users"}</Badge>
                    </div>
                    <p className="text-sm text-gray-400 mt-2 whitespace-pre-wrap break-words">{item.message}</p>
                    <p className="text-[11px] text-gray-600 mt-3">{formatDate(item.createdAt)}</p>
                  </div>
                  <button type="button" onClick={() => handleRemove(item._id)} disabled={removingId === item._id} className="btn-ghost text-accent-red px-3 py-2 disabled:opacity-60" title="Remove announcement">
                    {removingId === item._id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  WORKFLOWS TAB
// ─────────────────────────────────────────────────────────────────────────────
function WorkflowsTab() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get("/api/workflows"); setWorkflows(Array.isArray(data?.workflows) ? data.workflows : []); }
    catch { toast.error("Failed to load workflows."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const templates = [
    { name: "Retention: Delete after 30 days", description: "Marks files older than 30 days as deleted.", trigger: { type: "time", scheduleType: "daily", scheduleTime: "02:00" }, actions: [{ type: "delete", label: "Retention Delete", params: { retentionDays: 30 } }] },
    { name: "Backup on upload (local)", description: "Backs up newly uploaded files to server backups folder.", trigger: { type: "file_event", event: "upload" }, actions: [{ type: "backup", label: "Local Backup", params: {} }] },
    { name: "Weekly report", description: "Generates a weekly summary report.", trigger: { type: "time", scheduleType: "weekly", scheduleTime: "03:00", daysOfWeek: ["mon"] }, actions: [{ type: "report", label: "Weekly Report", params: {} }] },
    { name: "Require approval before delete", description: "Defers delete actions until an admin approves.", trigger: { type: "file_event", event: "delete" }, approval: { required: true }, actions: [{ type: "delete", label: "Delete after approval", params: {} }] },
  ];

  const applyTemplate = async (t) => {
    setApplying(t.name);
    try { await api.post("/api/workflows", { ...t }); toast.success("Template applied: " + t.name); fetchWorkflows(); }
    catch (err) { toast.error(err.response?.data?.message || "Failed to apply template"); }
    finally { setApplying(null); }
  };

  const toggleWorkflow = async (w) => {
    try { await api.put(`/api/workflows/${w._id}`, { isActive: !w.isActive }); fetchWorkflows(); }
    catch { toast.error("Failed to update."); }
  };

  const deleteWorkflow = async (w) => {
    if (!confirm(`Delete workflow "${w.name}"?`)) return;
    try { await api.delete(`/api/workflows/${w._id}`); toast.success("Deleted."); fetchWorkflows(); }
    catch { toast.error("Delete failed."); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Zap size={14} className="text-brand-glow" /> Automation Workflows
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{workflows.length} workflow{workflows.length !== 1 ? "s" : ""} configured</p>
        </div>
        <a href="/admin/workflows" className="btn-primary px-3 py-1.5 text-xs">
          <ExternalLink size={12} /> Open Builder
        </a>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-brand-glow" /></div>
      ) : workflows.length > 0 ? (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {workflows.map((w) => (
            <div key={w._id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate">{w.name}</p>
                    <Badge variant={w.isActive ? "active" : "default"}>{w.isActive ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 truncate">{w.description || "No description"}</p>
                  <p className="text-[10px] text-gray-600 mt-1 font-mono">Trigger: {w.trigger?.type} · {w.actions?.length || 0} action(s)</p>
                </div>
              </div>
              <div className="flex gap-1.5 mt-3">
                <button onClick={() => toggleWorkflow(w)} className="btn-ghost text-xs px-2.5 py-1">
                  {w.isActive ? <><Pause size={10} /> Disable</> : <><Zap size={10} /> Enable</>}
                </button>
                <button onClick={() => deleteWorkflow(w)} className="btn-ghost text-xs px-2.5 py-1 text-accent-red">
                  <Trash2 size={10} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <Zap size={28} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No workflows configured yet.</p>
          <p className="text-gray-600 text-xs mt-1">Apply a template below to get started.</p>
        </div>
      )}

      <div>
        <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
          <Filter size={13} className="text-brand-glow" /> Quick Start Templates
        </h3>
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
          {templates.map((t) => (
            <div key={t.name} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-white text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                </div>
              </div>
              <button onClick={() => applyTemplate(t)} disabled={applying === t.name} className="btn-primary text-xs px-3 py-1.5 mt-3 w-full justify-center">
                {applying === t.name ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                {applying === t.name ? "Applying…" : "Apply Template"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Admin Page — every tab wrapped in ErrorBoundary
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "users", label: "Users", icon: Users },
  { id: "files", label: "Files", icon: FileText },
  { id: "activity", label: "Activity Log", icon: Activity },
  { id: "workflows", label: "Workflows", icon: Filter },
  { id: "announce", label: "Announcements", icon: Megaphone },
  { id: "branding", label: "Branding", icon: Palette },
];

export default function AdminPage() {
  const [activeTab, setTab] = useState("overview");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-900/20 border border-amber-900/30 flex items-center justify-center">
          <Shield size={18} className="text-amber-400" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl text-white">Admin Panel</h1>
          <p className="text-xs text-gray-500">System management & configuration</p>
        </div>
      </div>

      <div className="flex gap-1 bg-surface-2 border border-surface-4 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === id ? "bg-surface-1 text-white shadow-sm border border-surface-4" : "text-gray-500 hover:text-gray-300"}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      <div className="animate-fade-up">
        <ErrorBoundary>
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "users" && <UserManagementTab />}
          {activeTab === "files" && <FileOversightTab />}
          {activeTab === "activity" && <SystemActivityTab />}
          {activeTab === "workflows" && <WorkflowsTab />}
          {activeTab === "announce" && <AnnouncementsTab />}
          {activeTab === "branding" && <AdminBrandingEditor />}
        </ErrorBoundary>
      </div>
    </div>
  );
}
