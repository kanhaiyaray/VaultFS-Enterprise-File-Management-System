import { Monitor, Globe, Smartphone } from "lucide-react";
import { Card, EmptyState } from "./AnalyticsUI";

const PLATFORM_ICONS = { windows: Monitor, mac: Monitor, linux: Monitor, ios: Smartphone, android: Smartphone };

export default function LocationAnalytics({ data }) {
  if (!data) return null;
  const platforms = (data.platformBreakdown || []).slice(0, 6);
  const total = platforms.reduce((s, p) => s + p.count, 0);

  return (
    <Card title="Access by Platform" subtitle="Device distribution from trusted sessions">
      {platforms.length > 0 ? (
        <div className="space-y-2.5">
          {platforms.map((p) => {
            const Icon = PLATFORM_ICONS[(p.platform || "").toLowerCase()] || Globe;
            const pct = total > 0 ? Math.round((p.count / total) * 100) : 0;
            return (
              <div key={p.platform}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <Icon size={11} className="text-brand-glow" />
                    <span className="text-gray-300 capitalize">{p.platform}</span>
                  </div>
                  <span className="text-gray-500 font-mono">{pct}%</span>
                </div>
                <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-brand rounded-full" style={{ width: pct + "%" }} />
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-gray-600 pt-2 border-t border-surface-3 leading-relaxed">
            Geographic access analytics require an IP geolocation provider. Configure one server-side to enable this card.
          </p>
        </div>
      ) : (
        <EmptyState icon={Globe} title="No device data" description="Sign in from devices to build your access profile." />
      )}
    </Card>
  );
}
