import { FileText, HardDrive, Users, Share2, ShieldAlert, Zap } from "lucide-react";
import { Trend } from "./AnalyticsUI";

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const formatNum = (n = 0) => n.toLocaleString("en-US");

function KPICard({ icon: Icon, label, value, sub, trend, accent = "brand" }) {
  const accents = {
    brand:   { bg: "bg-brand/15",       border: "border-brand/25",       icon: "text-brand-glow" },
    emerald: { bg: "bg-emerald-900/20", border: "border-emerald-900/30", icon: "text-emerald-400" },
    amber:   { bg: "bg-amber-900/20",   border: "border-amber-900/30",   icon: "text-amber-400" },
    red:     { bg: "bg-red-900/20",     border: "border-red-900/30",     icon: "text-accent-red" },
    purple:  { bg: "bg-purple-900/20",  border: "border-purple-900/30",  icon: "text-purple-400" },
  }[accent] || { bg: "bg-brand/15", border: "border-brand/25", icon: "text-brand-glow" };

  return (
    <div className="card p-4 group hover:border-brand/30 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={"w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 " + accents.bg + " " + accents.border}>
          <Icon size={16} className={accents.icon} />
        </div>
        <Trend value={trend} />
      </div>
      <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-xl font-display font-bold text-white font-mono mt-0.5 leading-tight truncate">{value}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-1 truncate">{sub}</p>}
    </div>
  );
}

export default function KPICards({ overview }) {
  if (!overview) return null;
  const { totalFiles, storageUsed, activeUsers, filesShared, securityAlerts, automationRuns } = overview;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <KPICard icon={FileText} label={overview.isAdmin ? "Total Files" : "My Files"} value={formatNum(totalFiles.value)} trend={totalFiles.change} sub={formatNum(totalFiles.createdInPeriod || 0) + " created in period"} accent="brand" />
      <KPICard icon={HardDrive} label={overview.isAdmin ? "Workspace Storage" : "My Storage"} value={formatBytes(storageUsed.value)} sub={storageUsed.percent + "% of " + formatBytes(storageUsed.limit)} accent="purple" />
      <KPICard icon={Users} label={activeUsers.isAdmin ? "Active Users" : "Your Uploads"} value={formatNum(activeUsers.value)} trend={activeUsers.change} sub={activeUsers.isAdmin ? "Users with file activity" : formatNum(activeUsers.previous) + " in prev"} accent="emerald" />
      <KPICard icon={Share2} label={overview.isAdmin ? "Files Shared" : "My Shared Files"} value={formatNum(filesShared.value)} sub="Active share links + gallery" accent="amber" />
      <KPICard icon={ShieldAlert} label="Security Alerts" value={formatNum(securityAlerts.value)} trend={securityAlerts.change} sub="Suspicious devices" accent={securityAlerts.value > 0 ? "red" : "emerald"} />
      <KPICard icon={Zap} label="Automation" value={formatNum(automationRuns.value)} trend={automationRuns.change} sub={formatNum(automationRuns.previous) + " prev"} accent="brand" />
    </div>
  );
}
