import { Zap, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Card, EmptyState } from "./AnalyticsUI";

export default function WorkflowInsights({ data }) {
  if (!data) return null;
  const total = data.total || 0;
  const successPct = total > 0 ? Math.round((data.successful / total) * 100) : 0;

  return (
    <Card title="Workflow Insights" subtitle={(data.totalWorkflows || 0) + " active workflow" + (data.totalWorkflows !== 1 ? "s" : "")}>
      {total > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="#27272a" strokeWidth="8" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="#34d399" strokeWidth="8" strokeLinecap="round" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 * (1 - successPct / 100)} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold text-white font-mono leading-none">{total}</span>
                <span className="text-[9px] text-gray-500 mt-0.5">Runs</span>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5"><CheckCircle2 size={11} className="text-emerald-400" /><span className="text-gray-300">Successful</span></div>
                <span className="font-mono text-emerald-400">{successPct}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5"><XCircle size={11} className="text-accent-red" /><span className="text-gray-300">Failed</span></div>
                <span className="font-mono text-accent-red">{total > 0 ? Math.round((data.failed / total) * 100) : 0}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5"><Loader2 size={11} className="text-amber-400" /><span className="text-gray-300">In Progress</span></div>
                <span className="font-mono text-amber-400">{total > 0 ? Math.round(((data.inProgress + data.pending) / total) * 100) : 0}%</span>
              </div>
            </div>
          </div>
          {data.recentRuns?.length > 0 && (
            <div className="pt-3 border-t border-surface-3 space-y-1.5">
              {data.recentRuns.slice(0, 3).map((run, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400 truncate flex-1">{run.workflowName}</span>
                  <span className={run.status === "completed" ? "text-emerald-400" : run.status === "failed" ? "text-accent-red" : "text-amber-400"}>{run.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <EmptyState icon={Zap} title="No workflow runs" description="Set up an automation to track execution." />
      )}
    </Card>
  );
}
