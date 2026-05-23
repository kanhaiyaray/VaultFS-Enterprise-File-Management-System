import { useState, useEffect, useCallback } from "react";
import {
  Users, FileText, BarChart3, Shield, Settings2, Megaphone, Palette,
  Search, RefreshCw, ChevronDown, MoreVertical, Ban, UserCheck, Key,
  Trash2, Eye, Download, AlertTriangle, CheckCircle2, X, Loader2,
  HardDrive, Upload, Clock, Database, TrendingUp, Crown, UserX,
  CheckSquare, Square, Send, Link2, Copy, ExternalLink, ChevronRight,
  Hash, Activity, Filter, Calendar, ArrowUpDown, Globe, LogIn,
  Star, Undo2, Share2,
} from "lucide-react";
import api from "../utils/api";
import { formatBytes, formatDate } from "../utils/helpers";
import toast from "react-hot-toast";
import { AdminBrandingEditor } from "../components/BrandingProvider";

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color = "text-brand-glow", bg = "bg-brand/10 border-brand/20" }) => (
  <div className="card p-4 flex items-start gap-3">
    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${bg}`}>
      <Icon size={18} className={color} />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-xl font-bold text-white font-mono mt-0.5">{value ?? "—"}</p>
      {sub && <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const Badge = ({ children, variant = "default" }) => {
  const styles = {
    default: "bg-surface-3 text-gray-400 border-surface-4",
    admin:   "bg-amber-900/20 text-amber-300 border-amber-900/30",
    banned:  "bg-red-900/20 text-accent-red border-red-900/30",
    active:  "bg-emerald-900/20 text-emerald-400 border-emerald-900/30",
    brand:   "bg-brand/15 text-brand-glow border-brand/25",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${styles[variant]}`}>
      {children}
    </span>
  );
};

function ConfirmModal({ title, message, confirmLabel = "Confirm", danger = true, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface-1 border border-surface-4 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${danger ? "bg-red-900/30 border border-red-900/50" : "bg-amber-900/30 border border-amber-900/50"}`}>
            <AlertTriangle size={18} className={danger ? "text-accent-red" : "text-accent-amber"} />
          </div>
          <h3 className="font-display font-bold text-white">{title}</h3>
        </div>
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 justify-center font-semibold rounded-lg px-4 py-2 text-sm transition-all ${
              danger ? "bg-accent-red/15 text-accent-red border border-red-900/40 hover:bg-accent-red/25" : "btn-primary"
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  OVERVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/admin/stats");
      setStats(data.stats);
    } catch { toast.error("Failed to load stats."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-brand-glow" /></div>;
  if (!stats)  return null;

  return (
    <div className="space-y-6">
      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users}     label="Total Users"   value={stats.users.total}
          sub={`${stats.users.active} active · ${stats.users.banned} banned`} />
        <StatCard icon={CheckCircle2} label="Verified"   value={stats.users.verified}
          color="text-emerald-400" bg="bg-emerald-900/10 border-emerald-900/20"
          sub={`${Math.round((stats.users.verified / (stats.users.total || 1)) * 100)}% of users`} />
        <StatCard icon={FileText}  label="Total Files"   value={stats.files.total.toLocaleString()}
          sub={formatBytes(stats.files.totalSize)} />
        <StatCard icon={Trash2}    label="In Trash"      value={stats.files.trash}
          color="text-accent-red" bg="bg-red-900/10 border-red-900/20" />
      </div>

      {/* Upload trend */}
      <div className="card p-5">
        <h3 className="font-display font-semibold text-white text-sm mb-4 flex items-center gap-2">
          <TrendingUp size={14} className="text-brand-glow" /> Upload Trend (30 days)
        </h3>
        {stats.uploadTrend.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-6">No uploads in last 30 days.</p>
        ) : (
          <div className="flex items-end gap-0.5 h-24">
            {stats.uploadTrend.map((day) => {
              const max = Math.max(...stats.uploadTrend.map((d) => d.count), 1);
              const pct = Math.round((day.count / max) * 100);
              return (
                <div key={day._id} className="flex-1 group relative">
                  <div
                    className="w-full bg-brand/40 hover:bg-brand/60 rounded-sm transition-all cursor-default"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                    title={`${day._id}: ${day.count} uploads`}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* File type breakdown */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-3 flex items-center gap-2">
            <Database size={14} className="text-brand-glow" /> File Types
          </h3>
          <div className="space-y-2">
            {stats.fileTypeBreakdown.slice(0, 8).map((type) => {
              const max = stats.fileTypeBreakdown[0]?.count || 1;
              return (
                <div key={type._id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-16 flex-shrink-0 capitalize">{type._id || "other"}</span>
                  <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-brand/60 rounded-full" style={{ width: `${(type.count / max) * 100}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 font-mono w-8 text-right">{type.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top uploaders */}
        <div className="card p-5">
          <h3 className="font-display font-semibold text-white text-sm mb-3 flex items-center gap-2">
            <Crown size={14} className="text-amber-400" /> Top Uploaders
          </h3>
          <div className="space-y-2">
            {stats.topUploaders.map((u, i) => (
              <div key={u._id} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-300 truncate">{u.user?.username}</p>
                  <p className="text-[10px] text-gray-600">{u.fileCount} files · {formatBytes(u.totalSize)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  USER MANAGEMENT TAB
// ─────────────────────────────────────────────────────────────────────────────
function UserManagementTab() {
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [total,    setTotal]    = useState(0);
  const [filter,   setFilter]   = useState({ role: "", status: "" });
  const [confirm,  setConfirm]  = useState(null);
  const [actionUser, setActionUser] = useState(null);
  const [banReason, setBanReason]   = useState("");
  const [banDuration, setBanDuration] = useState("");
  const [creating, setCreating] = useState(false);
  const [newUser,  setNewUser]  = useState({ username: "", email: "", password: "", role: "user" });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/admin/users", {
        params: { page, limit: 20, search, ...filter },
      });
      setUsers(data.users);
      setPages(data.pagination.pages);
      setTotal(data.pagination.total);
    } catch { toast.error("Failed to load users."); }
    finally { setLoading(false); }
  }, [page, search, filter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleBan = async () => {
    try {
      await api.post(`/api/admin/users/${actionUser._id}/ban`, {
        reason: banReason || undefined,
        duration: banDuration ? parseInt(banDuration) : undefined,
      });
      toast.success(`${actionUser.username} banned.`);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || "Ban failed."); }
    setActionUser(null); setBanReason(""); setBanDuration("");
  };

  const handleUnban = async (user) => {
    try {
      await api.post(`/api/admin/users/${user._id}/unban`);
      toast.success(`${user.username} unbanned.`);
      fetchUsers();
    } catch { toast.error("Unban failed."); }
  };

  const handleForceReset = async (user) => {
    try {
      await api.post(`/api/admin/users/${user._id}/force-reset`);
      toast.success(`Password reset email sent to ${user.email}.`);
    } catch { toast.error("Failed."); }
  };

  const handleDelete = async (user) => {
    try {
      await api.delete(`/api/admin/users/${user._id}`);
      toast.success(`User "${user.username}" deleted.`);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.message || "Delete failed."); }
  };

  const handleImpersonate = async (user) => {
    try {
      const { data } = await api.post(`/api/admin/users/${user._id}/impersonate`);
      const originalToken = localStorage.getItem("token");
      localStorage.setItem("impersonating_token", originalToken);
      localStorage.setItem("token", data.token);
      toast.success(`Impersonating ${user.username}. Close tab to return.`);
      window.location.href = "/dashboard";
    } catch (err) { toast.error(err.response?.data?.message || "Impersonate failed."); }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      return toast.error("All fields are required.");
    }
    setCreating(true);
    try {
      await api.post("/api/admin/users/create", newUser);
      toast.success(`User "${newUser.username}" created.`);
      setNewUser({ username: "", email: "", password: "", role: "user" });
      setCreating(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Create failed.");
      setCreating(false);
    }
  };

  // ✅ Fixed CSV export: uses axios blob download with auth token
  const exportCSV = async () => {
    try {
      const response = await api.get("/api/admin/users/export", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vaultfs-users-${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV exported.");
    } catch (err) {
      toast.error("Export failed.");
    }
  };

  return (
    <div className="space-y-4">
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}

      {/* Ban modal */}
      {actionUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setActionUser(null)}>
          <div className="bg-surface-1 border border-surface-4 rounded-2xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display font-bold text-white mb-4">Ban {actionUser.username}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Reason</label>
                <input className="input" placeholder="Violated ToS…" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Duration (hours, leave empty for permanent)</label>
                <input type="number" className="input" placeholder="e.g. 72" value={banDuration} onChange={(e) => setBanDuration(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setActionUser(null)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleBan} className="flex-1 justify-center font-semibold rounded-lg px-4 py-2 text-sm bg-accent-red/15 text-accent-red border border-red-900/40 hover:bg-accent-red/25 transition-all flex items-center gap-2">
                <Ban size={13} /> Ban User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input pl-8 text-sm"
            placeholder="Search users…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="input text-sm w-32" value={filter.role} onChange={(e) => setFilter((p) => ({ ...p, role: e.target.value }))}>
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select className="input text-sm w-36" value={filter.status} onChange={(e) => setFilter((p) => ({ ...p, status: e.target.value }))}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="banned">Banned</option>
          <option value="verified">Verified</option>
          <option value="unverified">Unverified</option>
        </select>
        <button onClick={fetchUsers} className="btn-ghost px-3 py-2"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /></button>
        <button onClick={exportCSV} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5">
          <Download size={12} /> Export CSV
        </button>
      </div>

      {/* Create user inline */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleCreateUser();
        }}
        className="card p-4 border-dashed"
      >
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Create User</p>
        <div className="grid sm:grid-cols-4 gap-2">
          <input className="input text-sm" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))} />
          <input className="input text-sm" placeholder="Email" type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} />
          <input className="input text-sm" placeholder="Password" type="password" value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} />
          <div className="flex gap-2">
            <select className="input text-sm flex-1" value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={creating} className="btn-primary px-4 py-2 text-sm">
              {creating ? <Loader2 size={13} className="animate-spin" /> : "+"}
            </button>
          </div>
        </div>
      </form>

      {/* User table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-3">
          <p className="text-xs text-gray-500">{total} user{total !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-brand-glow" /></div>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-600 text-sm py-10">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 border-b border-surface-3">
                <tr>
                  {["User", "Email", "Role", "Storage", "Files", "Status", "Joined", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-3">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-surface-2 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-brand/15 border border-brand/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[11px] font-bold text-brand-glow">{(u.displayName || u.username)?.[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-200 text-xs">{u.displayName || u.username}</p>
                          <p className="text-[10px] text-gray-600">@{u.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{u.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={u.role === "admin" ? "admin" : "default"}>{u.role}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono">
                      {formatBytes(u.storageUsed)} / {formatBytes(u.storageLimit)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{u.fileCount || 0}</td>
                    <td className="px-4 py-3">
                      {u.isBanned
                        ? <Badge variant="banned">Banned</Badge>
                        : u.emailVerified
                          ? <Badge variant="active">Verified</Badge>
                          : <Badge>Unverified</Badge>
                      }
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {u.isBanned ? (
                          <button onClick={() => handleUnban(u)} title="Unban" className="p-1.5 rounded text-emerald-500 hover:bg-emerald-900/20 transition-colors">
                            <UserCheck size={13} />
                          </button>
                        ) : (
                          <button onClick={() => setActionUser(u)} title="Ban" className="p-1.5 rounded text-accent-red hover:bg-red-900/20 transition-colors">
                            <Ban size={13} />
                          </button>
                        )}
                        <button onClick={() => handleForceReset(u)} title="Force Password Reset" className="p-1.5 rounded text-amber-400 hover:bg-amber-900/20 transition-colors">
                          <Key size={13} />
                        </button>
                        <button onClick={() => handleImpersonate(u)} title="Impersonate" className="p-1.5 rounded text-brand-glow hover:bg-brand/10 transition-colors">
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={() => setConfirm({
                            title: "Delete User",
                            message: `Permanently delete "${u.username}" and ALL their files?`,
                            confirmLabel: "Delete Forever",
                            onConfirm: () => handleDelete(u),
                          })}
                          title="Delete" className="p-1.5 rounded text-gray-600 hover:text-accent-red hover:bg-red-900/10 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-sm px-3 py-2">Previous</button>
          <span className="text-sm text-gray-500 font-mono">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn-ghost text-sm px-3 py-2">Next</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  FILE OVERSIGHT TAB
// ─────────────────────────────────────────────────────────────────────────────
function FileOversightTab() {
  const [activeView, setActiveView] = useState("all");
  const [files,    setFiles]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [pages,    setPages]    = useState(1);
  const [total,    setTotal]    = useState(0);
  const [confirm,  setConfirm]  = useState(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      if (activeView === "all") {
        const { data } = await api.get("/api/admin/files", { params: { page, limit: 25, search } });
        setFiles(data.files); setPages(data.pagination.pages); setTotal(data.pagination.total);
      } else if (activeView === "search" && search) {
        const { data } = await api.get("/api/admin/files/search", { params: { q: search, page, limit: 25 } });
        setFiles(data.files); setPages(data.pagination.pages); setTotal(data.pagination.total);
      } else if (activeView === "hogs") {
        const { data } = await api.get("/api/admin/files/storage-hogs");
        setFiles(data.files); setPages(1); setTotal(data.files.length);
      } else if (activeView === "orphaned") {
        const { data } = await api.get("/api/admin/files/orphaned");
        setFiles(data.files); setPages(1); setTotal(data.count);
      }
    } catch { toast.error("Failed to load files."); }
    finally { setLoading(false); }
  }, [activeView, page, search]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleDelete = async (file) => {
    try {
      await api.delete(`/api/admin/files/${file._id}`);
      toast.success("File deleted.");
      fetchFiles();
    } catch { toast.error("Delete failed."); }
  };

  const cleanupOrphaned = async () => {
    try {
      const { data } = await api.post("/api/admin/files/orphaned/cleanup");
      toast.success(data.message);
      fetchFiles();
    } catch { toast.error("Cleanup failed."); }
  };

  const VIEWS = [
    { id: "all",      label: "All Files"       },
    { id: "hogs",     label: "Storage Hogs"    },
    { id: "orphaned", label: "Orphaned"        },
    { id: "search",   label: "Full-Text Search" },
  ];

  return (
    <div className="space-y-4">
      {confirm && <ConfirmModal {...confirm} onClose={() => setConfirm(null)} />}

      <div className="flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button key={v.id} onClick={() => { setActiveView(v.id); setPage(1); }}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
              activeView === v.id ? "bg-brand/15 border-brand/30 text-brand-glow" : "btn-ghost"
            }`}>
            {v.label}
          </button>
        ))}

        {(activeView === "all" || activeView === "search") && (
          <div className="relative flex-1 min-w-40">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input className="input pl-8 text-sm" placeholder="Search file names, tags…"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
        )}

        {activeView === "orphaned" && files.length > 0 && (
          <button onClick={() => setConfirm({
            title: "Cleanup Orphaned Files",
            message: `Remove ${files.length} orphaned file(s) from disk?`,
            confirmLabel: "Cleanup",
            onConfirm: cleanupOrphaned,
          })} className="btn-ghost text-xs text-accent-red px-3 py-2 flex items-center gap-1.5">
            <Trash2 size={12} /> Cleanup All
          </button>
        )}

        <button onClick={fetchFiles} className="btn-ghost px-3 py-2">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <p className="text-xs text-gray-600">{total.toLocaleString()} file{total !== 1 ? "s" : ""}</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-brand-glow" /></div>
      ) : files.length === 0 ? (
        <div className="card p-16 text-center">
          <FileText size={32} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No files found.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 border-b border-surface-3">
                <tr>
                  {["Filename", "Owner", "Size", "Type", "Uploaded", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-3">
                {files.map((f) => (
                  <tr key={f._id} className="hover:bg-surface-2 transition-colors group">
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-xs font-medium text-gray-200 truncate" title={f.originalName}>{f.originalName}</p>
                      {f.tags?.length > 0 && (
                        <p className="text-[10px] text-gray-600 truncate">{f.tags.slice(0, 3).map(t => `#${t}`).join(" ")}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{f.owner?.username || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 font-mono whitespace-nowrap">{formatBytes(f.size)}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{f.mimetype?.split("/")[1] || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{new Date(f.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setConfirm({
                          title: "Delete File",
                          message: `Permanently delete "${f.originalName}"?`,
                          confirmLabel: "Delete",
                          onConfirm: () => handleDelete(f),
                        })} className="p-1.5 rounded text-gray-600 hover:text-accent-red hover:bg-red-900/10 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-sm px-3 py-2">Previous</button>
          <span className="text-sm text-gray-500 font-mono">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn-ghost text-sm px-3 py-2">Next</button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  ANNOUNCEMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
function AnnouncementsTab() {
  const [subject,    setSubject]    = useState("");
  const [message,    setMessage]    = useState("");
  const [sendEmail,  setSendEmail]  = useState(false);
  const [targetRole, setTargetRole] = useState("");
  const [loading,    setLoading]    = useState(false);
  const [sent,       setSent]       = useState(false);
  const [items,      setItems]      = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [removingId, setRemovingId] = useState("");

  const fetchAnnouncements = useCallback(async () => {
    setListLoading(true);
    try {
      const { data } = await api.get("/api/admin/announcements");
      setItems(data.announcements || []);
    } catch {
      toast.error("Failed to load announcements.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handleSend = async () => {
    if (!message.trim()) return toast.error("Message cannot be empty.");
    setLoading(true);
    try {
      const { data } = await api.post("/api/admin/announce", { subject, message, sendEmail, targetRole: targetRole || undefined });
      toast.success(data.message);
      setSent(true);
      setMessage(""); setSubject("");
      setItems((prev) => [data.announcement, ...prev].slice(0, 20));
      setTimeout(() => setSent(false), 3000);
    } catch { toast.error("Broadcast failed."); }
    finally { setLoading(false); }
  };

  const handleRemove = async (id) => {
    setRemovingId(id);
    try {
      await api.delete(`/api/admin/announcements/${id}`);
      setItems((prev) => prev.filter((item) => item._id !== id));
      toast.success("Announcement removed.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove announcement.");
    } finally {
      setRemovingId("");
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="card p-5 space-y-4">
        <h3 className="font-display font-semibold text-white text-sm flex items-center gap-2">
          <Megaphone size={14} className="text-brand-glow" /> Broadcast Announcement
        </h3>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Subject (for email)</label>
          <input className="input" placeholder="e.g. Scheduled maintenance" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Message *</label>
          <textarea
            className="input resize-none"
            rows={5}
            placeholder="Write your announcement here…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Target Audience</label>
            <select className="input text-sm" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}>
              <option value="">All Users</option>
              <option value="user">Regular Users</option>
              <option value="admin">Admins Only</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-5">
            <span
              className="text-sm text-gray-400 cursor-pointer select-none"
              onClick={() => setSendEmail((p) => !p)}
            >
              Also send via email
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={!!sendEmail}
              onClick={() => setSendEmail((p) => !p)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
                sendEmail ? "bg-brand" : "bg-surface-4"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                  sendEmail ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-surface-2 rounded-lg border border-surface-4 text-xs text-gray-500">
          <AlertTriangle size={12} className="text-accent-amber mt-0.5 flex-shrink-0" />
          In-app announcement is sent instantly via WebSocket. Email delivery may take a moment.
        </div>

        <button onClick={handleSend} disabled={loading || !message.trim()} className="btn-primary flex items-center gap-2 px-5 py-2.5">
          {loading ? <Loader2 size={14} className="animate-spin" /> : sent ? <CheckCircle2 size={14} /> : <Send size={14} />}
          {loading ? "Sending…" : sent ? "Sent!" : "Send Announcement"}
        </button>
      </div>

      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-white text-sm">Active Announcements</h3>
            <p className="text-xs text-gray-500 mt-1">Only admins can remove announcements after they are published.</p>
          </div>
          <button onClick={fetchAnnouncements} className="btn-ghost px-3 py-2" title="Refresh announcements">
            <RefreshCw size={13} className={listLoading ? "animate-spin" : ""} />
          </button>
        </div>

        {listLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-brand-glow" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-surface-4 bg-surface-2/50 p-5 text-sm text-gray-500">
            No active announcements right now.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="rounded-xl border border-surface-4 bg-surface-2/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-white">
                        {item.subject || "System Announcement"}
                      </p>
                      <Badge variant="brand">
                        {item.targetRole === "admin" ? "Admins Only" : item.targetRole === "user" ? "Regular Users" : "All Users"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mt-2 whitespace-pre-wrap break-words">
                      {item.message}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-3">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(item._id)}
                    disabled={removingId === item._id}
                    className="btn-ghost text-accent-red px-3 py-2 disabled:opacity-60"
                    title="Remove announcement"
                  >
                    {removingId === item._id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  SYSTEM ACTIVITY LOG TAB
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_META = {
  login:              { label: "Login",           icon: "🔑", color: "text-emerald-400" },
  logout:             { label: "Logout",          icon: "🚪", color: "text-gray-400" },
  register:           { label: "Register",        icon: "🆕", color: "text-brand-glow" },
  upload:             { label: "Upload",          icon: "⬆️",  color: "text-brand-glow" },
  download:           { label: "Download",        icon: "⬇️",  color: "text-blue-400" },
  delete:             { label: "Delete",          icon: "🗑️",  color: "text-accent-red" },
  restore:            { label: "Restore",         icon: "♻️",  color: "text-amber-400" },
  share:              { label: "Share",           icon: "🔗",  color: "text-purple-400" },
  unshare:            { label: "Unshare",         icon: "🔒",  color: "text-gray-400" },
  star:               { label: "Star",            icon: "⭐",  color: "text-amber-400" },
  unstar:             { label: "Unstar",          icon: "☆",   color: "text-gray-400" },
  rename:             { label: "Rename",          icon: "✏️",  color: "text-blue-400" },
  bulk_delete:        { label: "Bulk Delete",     icon: "🗑️",  color: "text-accent-red" },
  password_change:    { label: "Pwd Change",      icon: "🔐",  color: "text-amber-400" },
  settings_update:    { label: "Settings",        icon: "⚙️",  color: "text-gray-400" },
  profile_update:     { label: "Profile",         icon: "👤",  color: "text-blue-400" },
  "2fa_enable":       { label: "2FA On",          icon: "🛡️",  color: "text-emerald-400" },
  "2fa_disable":      { label: "2FA Off",         icon: "🛡️",  color: "text-accent-red" },
  file_request_create:{ label: "File Req",        icon: "📋",  color: "text-brand-glow" },
  file_request_submit:{ label: "Req Submit",      icon: "📩",  color: "text-purple-400" },
  team_invite:        { label: "Team Invite",     icon: "👥",  color: "text-emerald-400" },
  team_remove:        { label: "Team Remove",     icon: "👥",  color: "text-accent-red" },
};

function ActivityRow({ activity }) {
  const meta = ACTION_META[activity.action] || { label: activity.action, icon: "📌", color: "text-gray-400" };
  const user = activity.user;
  const det  = activity.details || {};

  const detailStr = det.filename || det.originalName
    ? `${det.filename || det.originalName}${det.size ? ` (${formatBytes(det.size)})` : ""}`
    : det.email || "";

  return (
    <tr className="hover:bg-surface-2 transition-colors group border-b border-surface-3/50">
      <td className="px-4 py-2.5 text-[11px] text-gray-500 font-mono whitespace-nowrap">
        {formatDate(activity.createdAt)}
      </td>
      <td className="px-4 py-2.5">
        {user ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand/15 border border-brand/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-brand-glow">
                {(user.displayName || user.username)?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate max-w-[120px]">
                {user.displayName || user.username}
              </p>
              <p className="text-[10px] text-gray-600 truncate max-w-[120px]">{user.email}</p>
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-600 italic">Deleted user</span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${meta.color}`}>
          <span>{meta.icon}</span>
          {meta.label}
        </span>
      </td>
      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[200px] truncate" title={detailStr}>
        {detailStr || <span className="text-gray-700 italic">—</span>}
      </td>
      <td className="px-4 py-2.5 text-[11px] text-gray-600 font-mono whitespace-nowrap">
        {activity.ip || "—"}
      </td>
    </tr>
  );
}

function SystemActivityTab() {
  const [activities, setActivities]   = useState([]);
  const [loading,    setLoading]      = useState(true);
  const [page,       setPage]         = useState(1);
  const [pages,      setPages]        = useState(1);
  const [total,      setTotal]        = useState(0);
  const [stats,      setStats]        = useState(null);
  const [showStats,  setShowStats]    = useState(true);

  const [filterAction,   setFilterAction]   = useState("");
  const [filterUser,     setFilterUser]     = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo,   setFilterDateTo]   = useState("");
  const [search,         setSearch]         = useState("");

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (filterAction)   params.action   = filterAction;
      if (filterUser)     params.userId   = filterUser;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo)   params.dateTo   = filterDateTo;
      if (search)         params.search   = search;

      const { data } = await api.get("/api/admin/activities", { params });
      setActivities(data.activities);
      setPages(data.pagination.pages);
      setTotal(data.pagination.total);
    } catch {
      toast.error("Failed to load activity log.");
    } finally {
      setLoading(false);
    }
  }, [page, filterAction, filterUser, filterDateFrom, filterDateTo, search]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("/api/admin/activities/stats");
      setStats(data);
    } catch {}
  }, []);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const clearFilters = () => {
    setFilterAction(""); setFilterUser(""); setFilterDateFrom(""); setFilterDateTo(""); setSearch(""); setPage(1);
  };
  const hasFilters = filterAction || filterUser || filterDateFrom || filterDateTo || search;

  return (
    <div className="space-y-4">
      {showStats && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.byAction.slice(0, 4).map((a) => {
            const meta = ACTION_META[a._id] || { label: a._id, icon: "📌", color: "text-gray-400" };
            return (
              <div key={a._id} className="card p-3 flex items-center gap-3 cursor-pointer hover:border-brand/30 transition-colors"
                onClick={() => { setFilterAction(a._id); setPage(1); }}>
                <span className="text-xl">{meta.icon}</span>
                <div>
                  <p className="text-xs text-gray-500">{meta.label}</p>
                  <p className="text-lg font-bold text-white font-mono">{a.count.toLocaleString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showStats && stats?.byDay?.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Activity size={12} className="text-brand-glow" />
              Activity — Last 30 Days ({total.toLocaleString()} total)
            </h3>
            <button onClick={() => setShowStats(false)} className="text-xs text-gray-600 hover:text-gray-400">
              Hide charts
            </button>
          </div>
          <div className="flex items-end gap-0.5 h-16">
            {stats.byDay.map((d) => {
              const max = Math.max(...stats.byDay.map((x) => x.count), 1);
              const pct = Math.round((d.count / max) * 100);
              return (
                <div key={d._id} className="flex-1 group relative" title={`${d._id}: ${d.count}`}>
                  <div
                    className="w-full bg-brand/40 hover:bg-brand/70 rounded-sm transition-all cursor-default"
                    style={{ height: `${Math.max(pct, 4)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input pl-8 text-sm"
            placeholder="Search by filename, IP…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select
          className="input text-sm w-36"
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
        >
          <option value="">All Actions</option>
          {Object.entries(ACTION_META).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>

        <input
          type="date"
          className="input text-sm w-36"
          value={filterDateFrom}
          onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
          title="From date"
        />
        <input
          type="date"
          className="input text-sm w-36"
          value={filterDateTo}
          onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
          title="To date"
        />

        <button onClick={() => { fetchActivities(); fetchStats(); }} className="btn-ghost px-3 py-2" title="Refresh">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
        </button>

        {hasFilters && (
          <button onClick={clearFilters} className="btn-ghost text-xs px-3 py-2 flex items-center gap-1.5 text-accent-red">
            <X size={12} /> Clear
          </button>
        )}

        {!showStats && (
          <button onClick={() => setShowStats(true)} className="btn-ghost text-xs px-3 py-2">
            Show charts
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-3 bg-surface-2">
          <p className="text-xs text-gray-500 font-mono">
            {total.toLocaleString()} event{total !== 1 ? "s" : ""}
            {hasFilters && <span className="ml-2 text-brand-glow">(filtered)</span>}
          </p>
          <p className="text-xs text-gray-600">Page {page} / {pages || 1}</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={22} className="animate-spin text-brand-glow" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-14">
            <Activity size={28} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">No activity found.</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-2 text-xs text-brand-glow hover:underline">
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-2/50">
                <tr>
                  {["Timestamp", "User", "Action", "Details", "IP"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <ActivityRow key={a._id} activity={a} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost text-sm px-3 py-2 disabled:opacity-40">
            Previous
          </button>
          <span className="text-sm text-gray-500 font-mono">{page} / {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn-ghost text-sm px-3 py-2 disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: "overview",     label: "Overview",        icon: BarChart3   },
  { id: "users",        label: "Users",           icon: Users       },
  { id: "files",        label: "Files",           icon: FileText    },
  { id: "activity",     label: "Activity Log",    icon: Activity    },
  { id: "announce",     label: "Announcements",   icon: Megaphone   },
  { id: "branding",     label: "Branding",        icon: Palette     },
];

export default function AdminPage() {
  const [activeTab, setTab] = useState("overview");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-900/20 border border-amber-900/30 flex items-center justify-center">
          <Shield size={18} className="text-amber-400" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl text-white">Admin Panel</h1>
          <p className="text-xs text-gray-500">System management & configuration</p>
        </div>
      </div>

      <div className="flex gap-1 bg-surface-2 border border-surface-4 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === id
                ? "bg-surface-1 text-white shadow-sm border border-surface-4"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div className="animate-fade-up">
        {activeTab === "overview"  && <OverviewTab />}
        {activeTab === "users"     && <UserManagementTab />}
        {activeTab === "files"     && <FileOversightTab />}
        {activeTab === "activity"  && <SystemActivityTab />}
        {activeTab === "announce"  && <AnnouncementsTab />}
        {activeTab === "branding"  && <AdminBrandingEditor />}
      </div>
    </div>
  );
}