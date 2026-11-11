import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { HardDrive } from "lucide-react";
import { Card, EmptyState, Badge } from "./AnalyticsUI";

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const fmtDate = (d) => {
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{fmtDate(label)}</p>
      <p className="text-brand-glow font-mono">{formatBytes(p.bytes)}</p>
      {p.additions > 0 && <p className="text-emerald-400 text-[10px] mt-0.5">+{formatBytes(p.additions)} ({p.count} files)</p>}
    </div>
  );
};

export default function StorageTrendChart({ data }) {
  if (!data) return null;
  return (
    <Card
      title="Storage Usage Trend"
      subtitle={formatBytes(data.current) + " of " + formatBytes(data.limit) + " used"}
      action={<Badge variant={data.percent > 85 ? "danger" : data.percent > 70 ? "warning" : "success"}>{data.percent}%</Badge>}
    >
      {data.trend?.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.trend} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="storageGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.55} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmtDate} interval={Math.max(0, Math.floor(data.trend.length / 6))} />
              <YAxis tick={{ fill: "#71717a", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={formatBytes} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="bytes" stroke="#a78bfa" strokeWidth={2} fill="url(#storageGradient)" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-surface-3">
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Growth</p>
              <p className="text-sm font-mono text-emerald-400">+{data.growthRate}%</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Daily Avg</p>
              <p className="text-sm font-mono text-gray-300">{formatBytes(data.avgDailyAdd)}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider">Est. Full</p>
              <p className={"text-sm font-mono " + (data.daysToFull && data.daysToFull < 90 ? "text-accent-amber" : "text-gray-300")}>
                {data.daysToFull ? data.daysToFull + "d" : "∞"}
              </p>
            </div>
          </div>
        </>
      ) : (
        <EmptyState icon={HardDrive} title="No storage data" description="Upload a file to see your storage trend." />
      )}
    </Card>
  );
}
