import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Users, TrendingUp } from "lucide-react";
import { Card, EmptyState, Badge } from "./AnalyticsUI";

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{d.label}</p>
      <p className="text-brand-glow font-mono">{d.count} new users</p>
    </div>
  );
};

export default function UserGrowthChart({ data }) {
  if (!data) return null;
  return (
    <Card title="User Growth" subtitle={data.isAdmin ? data.totalUsers + " users · by " + (data.bucketType || "days") : "Admin-only view"} action={data.isAdmin ? <Badge variant="brand"><TrendingUp size={10} /> +{data.newInRange}</Badge> : null}>
      {!data.isAdmin ? (
        <EmptyState icon={Users} title="Workspace-wide metrics" description="User growth analytics are only visible to workspace admins." />
      ) : data.growth?.length > 0 ? (
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data.growth} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "#71717a", fontSize: 9 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(139,92,246,0.1)" }} />
            <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState icon={Users} title="No user growth data" />
      )}
    </Card>
  );
}
