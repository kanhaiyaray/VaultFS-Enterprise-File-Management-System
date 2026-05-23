import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { BarChart3, HardDrive, FileUp, Download, TrendingUp, RefreshCw } from "lucide-react";
import api from "../utils/api";
import { formatBytes } from "../utils/helpers";
import toast from "react-hot-toast";

const COLORS = ["#6366f1", "#4ade80", "#fbbf24", "#f87171", "#60a5fa", "#a78bfa"];

const StatCard = ({ icon: Icon, label, value, sub, color = "text-brand-glow" }) => (
  <div className="card p-5">
    <div className="flex items-center gap-3 mb-2">
      <div className="w-9 h-9 rounded-xl bg-surface-3 flex items-center justify-center">
        <Icon size={16} className={color} />
      </div>
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-2xl font-display font-bold text-white">{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
  </div>
);

export default function AnalyticsPage() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/files/stats");
      setStats(data);
    } catch {
      toast.error("Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-5 max-w-6xl mx-auto">
        <div className="h-8 w-48 skeleton rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-28 skeleton" />)}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => <div key={i} className="card h-64 skeleton" />)}
        </div>
      </div>
    );
  }

  const mimeTypeData = Object.entries(stats?.byMimeType || {}).map(([name, value]) => ({
    name: name.split("/")[1] || name, value,
  })).sort((a, b) => b.value - a.value).slice(0, 8);

  const uploadTrendData = stats?.uploadTrend || [];
  const recentActivity  = stats?.recentActivity || [];
  const storagePercent  = stats?.storagePercent || 0;
  const storageColor    = storagePercent > 90 ? "bg-accent-red" : storagePercent > 70 ? "bg-accent-amber" : "bg-brand";

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-surface-2 border border-surface-4 rounded-lg px-3 py-2 text-xs">
        <p className="text-gray-400 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.fill || p.stroke }}>
            {p.name}: {typeof p.value === "number" && p.value > 1000 ? formatBytes(p.value) : p.value}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/20 flex items-center justify-center">
            <BarChart3 size={16} className="text-brand-glow" />
          </div>
          <h1 className="font-display font-bold text-xl text-white">Analytics</h1>
        </div>
        <button onClick={fetchStats} className="btn-ghost text-sm px-3 py-2">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FileUp}    label="Total Files"   value={stats?.totalFiles ?? 0} sub={`${stats?.totalFiles ?? 0} in vault`} />
        <StatCard icon={HardDrive} label="Storage Used"  value={formatBytes(stats?.storageUsed ?? 0)} sub={`of ${formatBytes(stats?.storageLimit ?? 0)}`} color="text-accent-amber" />
        <StatCard icon={Download}  label="Downloads"     value={stats?.totalDownloads ?? 0} sub="All time" color="text-accent-green" />
        <StatCard icon={TrendingUp} label="Uploaded Today" value={stats?.uploadedToday ?? 0} sub="Files today" color="text-accent-blue" />
      </div>

      {/* Storage bar */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-white">Storage Usage</p>
          <span className="text-xs text-gray-400 font-mono">{storagePercent}%</span>
        </div>
        <div className="h-3 bg-surface-4 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${storageColor}`} style={{ width: `${Math.min(storagePercent, 100)}%` }} />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-gray-600">{formatBytes(stats?.storageUsed ?? 0)} used</span>
          <span className="text-xs text-gray-600">{formatBytes(stats?.storageLimit ?? 0)} total</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* File types pie */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">File Types</h3>
          {mimeTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={mimeTypeData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                  paddingAngle={3} dataKey="value" nameKey="name">
                  {mimeTypeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={customTooltip} />
                <Legend formatter={(v) => <span className="text-xs text-gray-400">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">No file data yet</div>
          )}
        </div>

        {/* Upload trend */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Upload Trend (30 days)</h3>
          {uploadTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={uploadTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip content={customTooltip} />
                <Line type="monotone" dataKey="count" name="Files" stroke="#6366f1" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-600 text-sm">No upload trend data</div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {recentActivity.slice(0, 8).map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-surface-3 last:border-0">
                <span className="text-sm">{item.action === "upload" ? "⬆️" : item.action === "download" ? "⬇️" : "📌"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{item.fileName || "Unknown file"}</p>
                  <p className="text-xs text-gray-600">{item.action} · {new Date(item.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
