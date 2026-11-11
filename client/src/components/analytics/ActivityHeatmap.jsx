import { Activity } from "lucide-react";
import { Card, EmptyState } from "./AnalyticsUI";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = [0, 3, 6, 9, 12, 15, 18, 21];

function cellColor(value, max) {
  if (!value) return "bg-surface-3";
  const ratio = value / max;
  if (ratio < 0.2) return "bg-purple-900/40";
  if (ratio < 0.4) return "bg-purple-700/60";
  if (ratio < 0.6) return "bg-purple-600/70";
  if (ratio < 0.8) return "bg-purple-500/80";
  return "bg-purple-400";
}

export default function ActivityHeatmap({ data }) {
  if (!data?.heatmap) return null;
  const { grid, max } = data.heatmap;
  const total = grid.flat().reduce((s, v) => s + v, 0);

  return (
    <Card title="Usage Heatmap" subtitle="Activity by hour of week" action={<span className="text-[10px] text-gray-500 font-mono">{total} events</span>}>
      {total > 0 ? (
        <div className="space-y-1.5">
          <div className="flex items-center gap-0.5 pl-7">
            {HOURS.map((h) => (
              <div key={h} className="flex-1 text-center text-[9px] text-gray-600">
                {h === 0 ? "12a" : h === 12 ? "12p" : h > 12 ? (h - 12) + "p" : h + "a"}
              </div>
            ))}
          </div>
          {DAYS.map((day, ri) => (
            <div key={day} className="flex items-center gap-0.5">
              <span className="w-7 text-[10px] text-gray-600 text-right pr-1 flex-shrink-0">{day}</span>
              {Array.from({ length: 24 }, (_, ci) => {
                const val = grid[ri]?.[ci] || 0;
                return <div key={ci} className={"flex-1 h-4 rounded-sm " + cellColor(val, max) + " transition-colors hover:ring-1 hover:ring-brand/50"} title={day + " " + ci + ":00 — " + val + " events"} />;
              })}
            </div>
          ))}
          <div className="flex items-center justify-end gap-1 pt-1">
            <span className="text-[9px] text-gray-600">Low</span>
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r, i) => <div key={i} className={"w-2.5 h-2.5 rounded-sm " + cellColor(r * max, max)} />)}
            <span className="text-[9px] text-gray-600">High</span>
          </div>
        </div>
      ) : (
        <EmptyState icon={Activity} title="No activity data" description="Activity patterns will appear here." />
      )}
    </Card>
  );
}
