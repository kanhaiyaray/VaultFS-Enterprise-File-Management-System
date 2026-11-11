import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { FileText } from "lucide-react";
import { Card, EmptyState } from "./AnalyticsUI";

const COLORS = ["#8b5cf6", "#a78bfa", "#22d3ee", "#34d399", "#f59e0b", "#ec4899", "#64748b"];
const TYPE_LABELS = { image: "Images", video: "Videos", audio: "Audio", application: "Documents", text: "Text/Code", font: "Fonts", model: "3D Models", other: "Others" };

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-surface-2 border border-surface-4 rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-white font-medium">{p.label}</p>
      <p className="text-gray-400">{p.count} files</p>
    </div>
  );
};

export default function FileTypesChart({ data }) {
  if (!data) return null;
  const totalCount = (data.types || []).reduce((s, t) => s + t.count, 0);
  const chartData = (data.types || []).slice(0, 7).map((t, i) => ({
    name: t.type,
    label: TYPE_LABELS[t.type] || t.type,
    value: t.count,
    bytes: t.bytes,
    count: t.count,
    color: COLORS[i % COLORS.length],
  }));

  return (
    <Card title="File Types" subtitle={totalCount + " total files"}>
      {chartData.length > 0 ? (
        <div>
          <div className="relative">
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={2} stroke="none">
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-xl font-display font-bold text-white font-mono leading-none">{totalCount.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">Files</p>
            </div>
          </div>
          <div className="space-y-1.5 mt-3 pt-3 border-t border-surface-3">
            {chartData.map((c) => (
              <div key={c.name} className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-gray-300 truncate">{c.label}</span>
                </div>
                <span className="text-gray-500 font-mono flex-shrink-0">{totalCount > 0 ? Math.round((c.count / totalCount) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState icon={FileText} title="No files yet" description="Upload files to see the type breakdown." />
      )}
    </Card>
  );
}
