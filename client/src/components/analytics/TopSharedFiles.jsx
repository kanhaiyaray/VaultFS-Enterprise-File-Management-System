import { Share2, Download } from "lucide-react";
import { Card, EmptyState } from "./AnalyticsUI";

const getFileIcon = (mime = "") => {
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.startsWith("video/")) return "🎬";
  if (mime.startsWith("audio/")) return "🎵";
  if (mime === "application/pdf") return "📄";
  if (mime.includes("zip") || mime.includes("archive")) return "📦";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  if (mime.includes("excel") || mime.includes("sheet")) return "📊";
  if (mime.startsWith("text/")) return "📃";
  return "📁";
};

const truncate = (s = "", n = 28) => (s.length <= n ? s : s.slice(0, n - 1) + "…");

export default function TopSharedFiles({ data }) {
  if (!data) return null;
  const files = data.topShared || [];
  return (
    <Card title="Top Shared Files" subtitle={(data.total || 0) + " shared · " + (data.totalDownloads || 0) + " downloads"}>
      {files.length > 0 ? (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={f._id || i} className="flex items-center gap-2.5">
              <span className="text-base flex-shrink-0">{getFileIcon(f.mimetype)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-200 truncate" title={f.originalName}>{truncate(f.originalName, 30)}</p>
                <p className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                  <Download size={9} /> {f.shareDownloadCount || 0} downloads
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Share2} title="No shared files" description="Share a file to see download activity." />
      )}
    </Card>
  );
}
