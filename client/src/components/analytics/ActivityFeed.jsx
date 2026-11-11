import { Upload, Download, Share2, Trash2, Edit3, ShieldAlert, Zap, Activity as ActivityIcon } from "lucide-react";
import { Card, EmptyState, Badge } from "./AnalyticsUI";

const ACTION_META = {
  upload:         { icon: Upload,       color: "text-brand-glow",  bg: "bg-brand/10 border-brand/20",           label: "uploaded" },
  download:       { icon: Download,     color: "text-emerald-400", bg: "bg-emerald-900/15 border-emerald-900/25", label: "downloaded" },
  delete:         { icon: Trash2,       color: "text-accent-red",  bg: "bg-red-900/15 border-red-900/25",       label: "deleted" },
  rename:         { icon: Edit3,        color: "text-blue-400",    bg: "bg-blue-900/15 border-blue-900/25",     label: "renamed" },
  share:          { icon: Share2,       color: "text-purple-400",  bg: "bg-purple-900/15 border-purple-900/25", label: "shared" },
  "2fa_enable":   { icon: ShieldAlert,  color: "text-emerald-400", bg: "bg-emerald-900/15 border-emerald-900/25", label: "enabled 2FA" },
  "2fa_disable":  { icon: ShieldAlert,  color: "text-accent-red",  bg: "bg-red-900/15 border-red-900/25",       label: "disabled 2FA" },
  login:          { icon: ActivityIcon, color: "text-gray-400",    bg: "bg-surface-3 border-surface-4",         label: "logged in" },
  workflow_complete: { icon: Zap,       color: "text-amber-400",   bg: "bg-amber-900/15 border-amber-900/25",   label: "ran workflow" },
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

export default function ActivityFeed({ data }) {
  if (!data) return null;
  const feed = (data.feed || []).slice(0, 8);

  return (
    <Card title="Real-Time Activity Feed" subtitle={data.totalCount + " events this period"} action={<Badge variant="success"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live</Badge>}>
      {feed.length > 0 ? (
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
          {feed.map((a) => {
            const meta = ACTION_META[a.action] || ACTION_META.login;
            const Icon = meta.icon;
            const file = a.details?.filename || a.details?.originalName || a.details?.fileName;
            const user = a.user?.displayName || a.user?.username || "Anonymous";
            return (
              <div key={a._id} className="flex items-start gap-2.5">
                <div className={"w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 " + meta.bg}>
                  <Icon size={11} className={meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 leading-snug">
                    <span className="font-medium text-white">{user}</span>{" "}
                    <span className="text-gray-500">{meta.label}</span>
                    {file && <span className="text-gray-400"> "{file}"</span>}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{timeAgo(a.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={ActivityIcon} title="No activity yet" description="File events will appear here." />
      )}
    </Card>
  );
}
