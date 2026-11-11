import { Shield, CheckCircle2, XCircle } from "lucide-react";
import { Card, Badge } from "./AnalyticsUI";

function ScoreGauge({ score }) {
  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - score / 100);
  const color = score >= 80 ? "#34d399" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#27272a" strokeWidth="8" />
        <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-display font-bold text-white font-mono leading-none">{score}</span>
        <span className="text-[10px] text-gray-500 mt-0.5">/ 100</span>
      </div>
    </div>
  );
}

export default function SecurityOverview({ data }) {
  if (!data) return null;
  return (
    <Card title="Security Overview" action={<Badge variant={data.score >= 80 ? "success" : data.score >= 50 ? "warning" : "danger"}><Shield size={10} /> {data.score >= 80 ? "Strong" : data.score >= 50 ? "Fair" : "At Risk"}</Badge>}>
      <ScoreGauge score={data.score} />
      <div className="space-y-1.5 mt-4 pt-4 border-t border-surface-3">
        {data.checks.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              {c.passed ? <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" /> : <XCircle size={11} className="text-gray-600 flex-shrink-0" />}
              <span className={c.passed ? "text-gray-300" : "text-gray-500"}>{c.label}</span>
            </div>
            <span className={"font-mono text-[10px] " + (c.passed ? "text-emerald-400" : "text-gray-600")}>+{c.weight}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-surface-3 grid grid-cols-3 gap-2 text-center">
        <div><p className="text-[10px] text-gray-600 uppercase">Devices</p><p className="text-sm font-mono text-gray-300">{data.totalDevices}</p></div>
        <div><p className="text-[10px] text-gray-600 uppercase">Trusted</p><p className="text-sm font-mono text-emerald-400">{data.trustedDevices}</p></div>
        <div><p className="text-[10px] text-gray-600 uppercase">Flagged</p><p className={"text-sm font-mono " + (data.suspiciousDevices > 0 ? "text-accent-red" : "text-gray-300")}>{data.suspiciousDevices}</p></div>
      </div>
    </Card>
  );
}
