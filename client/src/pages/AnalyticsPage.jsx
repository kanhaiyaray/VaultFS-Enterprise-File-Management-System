import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import toast from "react-hot-toast";

import AnalyticsHeader from "../components/analytics/AnalyticsHeader";
import KPICards from "../components/analytics/KPICards";
import StorageTrendChart from "../components/analytics/StorageTrendChart";
import FileTypesChart from "../components/analytics/FileTypesChart";
import UserGrowthChart from "../components/analytics/UserGrowthChart";
import TeamActivityTable from "../components/analytics/TeamActivityTable";
import ActivityFeed from "../components/analytics/ActivityFeed";
import ActivityHeatmap from "../components/analytics/ActivityHeatmap";
import SecurityOverview from "../components/analytics/SecurityOverview";
import WorkflowInsights from "../components/analytics/WorkflowInsights";
import TopSharedFiles from "../components/analytics/TopSharedFiles";
import AuditComplianceCard from "../components/analytics/AuditComplianceCard";
import LocationAnalytics from "../components/analytics/LocationAnalytics";
import { AnalyticsSkeleton } from "../components/analytics/AnalyticsUI";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [range, setRange] = useState("30d");
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const abortRef = useRef(null);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const opts = { params: { range }, signal: controller.signal };
      const [overview, storage, files, sharing, activity, security, workflows, userGrowth] = await Promise.all([
        api.get("/api/analytics/overview",  opts),
        api.get("/api/analytics/storage",   opts),
        api.get("/api/analytics/files",     opts),
        api.get("/api/analytics/sharing",   opts),
        api.get("/api/analytics/activity",  opts),
        api.get("/api/analytics/security",  opts),
        api.get("/api/analytics/workflows", opts),
        api.get("/api/analytics/users",     opts),
      ]);
      setData({
        overview: overview.data, storage: storage.data, files: files.data, sharing: sharing.data,
        activity: activity.data, security: security.data, workflows: workflows.data, userGrowth: userGrowth.data,
      });
      setLastUpdated(new Date());
    } catch (err) {
      if (err.name !== "CanceledError" && err.name !== "AbortError" && err.code !== "ERR_CANCELED") {
        toast.error(err.response?.data?.message || "Failed to load analytics.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => { if (!isAdmin && tab === "users") setTab("overview"); }, [isAdmin, tab]);

  useEffect(() => { fetchAll(); return () => abortRef.current?.abort(); }, [fetchAll]);

  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") fetchAll(true); }, 60_000);
    return () => clearInterval(t);
  }, [fetchAll]);

  const handleExport = async (format) => {
    try {
      if (format === "csv") {
        const resp = await api.get("/api/analytics/export/csv", { params: { range }, responseType: "blob" });
        const url = URL.createObjectURL(resp.data);
        const a = document.createElement("a");
        a.href = url;
        a.download = "vaultfs-analytics-" + range + "-" + Date.now() + ".csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported");
      } else {
        toast.success("Opening print dialog...");
        setTimeout(() => window.print(), 200);
      }
    } catch { toast.error("Export failed"); }
  };

  if (loading) return <AnalyticsSkeleton />;
  if (!data) return <div className="p-10 text-center"><p className="text-gray-500">No analytics data available.</p></div>;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-5 animate-fade-up">
      <AnalyticsHeader range={range} setRange={setRange} tab={tab} setTab={setTab} refreshing={refreshing} lastUpdated={lastUpdated} onRefresh={() => fetchAll(true)} onExport={handleExport} isAdmin={isAdmin} />

      <KPICards overview={data.overview} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                <div className="lg:col-span-3"><StorageTrendChart data={data.storage} /></div>
                <div className="lg:col-span-2"><FileTypesChart data={data.files} /></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {isAdmin ? <TeamActivityTable data={data.overview} user={user} /> : <TopSharedFiles data={data.sharing} />}
                <ActivityFeed data={data.activity} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <LocationAnalytics data={data.security} />
                <SecurityOverview data={data.security} />
              </div>
            </>
          )}
          {tab === "usage" && (
            <>
              <StorageTrendChart data={data.storage} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <FileTypesChart data={data.files} />
                <SecurityOverview data={data.security} />
              </div>
              <TeamActivityTable data={data.overview} user={user} large />
            </>
          )}
          {tab === "users" && isAdmin && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <UserGrowthChart data={data.userGrowth} />
              <TeamActivityTable data={data.overview} user={user} large />
              <ActivityFeed data={data.activity} />
              <AuditComplianceCard />
            </div>
          )}
          {tab === "files" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <FileTypesChart data={data.files} />
              <TopSharedFiles data={data.sharing} />
              <StorageTrendChart data={data.storage} />
              <ActivityFeed data={data.activity} />
            </div>
          )}
          {tab === "security" && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <SecurityOverview data={data.security} />
                <LocationAnalytics data={data.security} />
              </div>
              <AuditComplianceCard />
            </>
          )}
          {tab === "activity" && (
            <>
              <ActivityHeatmap data={data.activity} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <ActivityFeed data={data.activity} />
                <SecurityOverview data={data.security} />
              </div>
            </>
          )}
          {tab === "reports" && (
            <div className="card p-6 space-y-4">
              <h3 className="font-display font-bold text-white">Reports & Exports</h3>
              <p className="text-sm text-gray-400 max-w-2xl">Export your analytics respecting the selected date range ({range}). Exports only include data you have permission to view.</p>
              <div className="flex flex-wrap gap-3 pt-2">
                <button onClick={() => handleExport("csv")} className="btn-primary px-5 py-2.5">Export CSV</button>
                <button onClick={() => handleExport("pdf")} className="btn-ghost px-5 py-2.5">Print / Save as PDF</button>
              </div>
              <div className="pt-4 border-t border-surface-3 grid sm:grid-cols-3 gap-3 text-xs">
                <div><p className="text-gray-600 uppercase tracking-wider text-[10px]">Total Files</p><p className="text-white font-mono text-base mt-1">{data.overview.totalFiles.value.toLocaleString()}</p></div>
                <div><p className="text-gray-600 uppercase tracking-wider text-[10px]">Uploads</p><p className="text-white font-mono text-base mt-1">{data.files.uploadsInRange.toLocaleString()}</p></div>
                <div><p className="text-gray-600 uppercase tracking-wider text-[10px]">Activity Events</p><p className="text-white font-mono text-base mt-1">{data.activity.totalCount.toLocaleString()}</p></div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {isAdmin && <UserGrowthChart data={data.userGrowth} />}
          <TopSharedFiles data={data.sharing} />
          {isAdmin && <WorkflowInsights data={data.workflows} />}
          {isAdmin && <AuditComplianceCard />}
          <ActivityHeatmap data={data.activity} />
        </div>
      </div>
    </div>
  );
}
