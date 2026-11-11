import { Users, Trophy } from "lucide-react";
import { Card, EmptyState, Badge } from "./AnalyticsUI";

const formatBytes = (bytes = 0) => {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

function Avatar({ name, src }) {
  if (src) return <img src={src} alt={name} className="w-7 h-7 rounded-full object-cover" />;
  const initial = (name || "?")[0]?.toUpperCase();
  return (
    <div className="w-7 h-7 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center flex-shrink-0">
      <span className="text-[10px] font-bold text-brand-glow">{initial}</span>
    </div>
  );
}

export default function TeamActivityTable({ data, user, large = false }) {
  if (!data) return null;
  const uploaders = data.topUploaders || [];
  const isAdmin = user?.role === "admin";

  return (
    <Card title={isAdmin ? "Team Activity (Top 5)" : "Your Uploads"} subtitle={isAdmin ? "Top contributors in this range" : "Files uploaded in this range"} action={<Badge variant="brand"><Users size={10} /> {uploaders.length}</Badge>}>
      {uploaders.length > 0 ? (
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-gray-600 border-b border-surface-3">
                <th className="text-left font-semibold py-2">User</th>
                <th className="text-right font-semibold py-2">Files</th>
                <th className="text-right font-semibold py-2">Storage</th>
              </tr>
            </thead>
            <tbody>
              {uploaders.map((u, i) => (
                <tr key={u.userId || i} className="border-b border-surface-3 last:border-0">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.displayName || u.username} src={u.avatarUrl} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-200 truncate">{u.displayName || u.username}</p>
                        <p className="text-[10px] text-gray-600 truncate">@{u.username}</p>
                      </div>
                      {i === 0 && <Trophy size={11} className="text-amber-400 flex-shrink-0" />}
                    </div>
                  </td>
                  <td className="text-right text-xs text-gray-300 font-mono py-2.5">{u.files.toLocaleString()}</td>
                  <td className="text-right text-xs text-gray-400 font-mono py-2.5">{formatBytes(u.bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Users} title="No activity yet" description="Team uploads will appear here." />
      )}
    </Card>
  );
}
