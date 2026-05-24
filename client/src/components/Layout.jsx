import { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Upload, Shield, LogOut, Menu, X, HardDrive, Zap,
  ChevronRight, BarChart3, Globe, Users, Settings, Activity, Star,
  Keyboard, Link2, Trash2,
} from "lucide-react";
import { useAuth }          from "../context/AuthContext";
import { useSocket }        from "../hooks/useSocket";
import { formatBytes }      from "../utils/helpers";
import { useBranding }      from "../components/BrandingProvider";
import { useActionHistory } from "../context/ActionHistoryContext";
import AnnouncementBanner   from "../components/AnnouncementBanner";
import KeyboardShortcuts    from "./KeyboardShortcuts";
import toast from "react-hot-toast";

const navItems = [
  { to: "/dashboard",     icon: LayoutDashboard, label: "Dashboard"      },
  { to: "/upload",        icon: Upload,           label: "Upload Files"   },
  { to: "/starred",       icon: Star,             label: "Starred Files"  },
  { to: "/analytics",     icon: BarChart3,        label: "Analytics"      },
  { to: "/gallery",       icon: Globe,            label: "Public Gallery" },
  { to: "/team",          icon: Users,            label: "Team"           },
  { to: "/file-requests", icon: Link2,            label: "File Requests"  },
  { to: "/settings",      icon: Settings,         label: "Settings"       },
];

const trashItem = { to: "/trash", icon: Trash2, label: "Trash" };

const ACTIVITY_ICONS = {
  upload:         "⬆️",
  delete:         "🗑️",
  bulk_delete:    "🗑️",
  chunk_progress: "⏳",
  banned:         "🚫",
};

export default function Layout({ children }) {
  const { user, logout }  = useAuth();
  const { branding }      = useBranding();
  const { undo, redo, canUndo, canRedo } = useActionHistory();
  const navigate          = useNavigate();
  const { on, off }       = useSocket();

  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [activityOpen,  setActivityOpen]  = useState(false);
  const [activities,    setActivities]    = useState([]);
  const [unread,        setUnread]        = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    on("activity", (event) => {
      setActivities((prev) => [{ ...event, id: Date.now() }, ...prev].slice(0, 30));
      if (!activityOpen) setUnread((n) => n + 1);
      if (event.type === "banned") {
        toast.error(event.payload?.message || "Account suspended.");
        logout();
        navigate("/login");
      }
    });
    return () => off("activity");
  }, [on, off, activityOpen, logout, navigate]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z")) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "?" && e.shiftKey) { setShowShortcuts(true);  return; }
      if (e.key === "Escape")          { setShowShortcuts(false); setSidebarOpen(false); return; }
      if (e.key === "u" || e.key === "U") { navigate("/upload");    return; }
      if (e.key === "d" || e.key === "D") { navigate("/dashboard"); return; }
      if (e.key === "s" || e.key === "S") { navigate("/starred");   return; }
      if (e.key === "a" || e.key === "A") { navigate("/analytics"); return; }
      if (e.key === "t" || e.key === "T") { navigate("/trash");     return; }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, redo, undo]);

  const handleLogout   = () => { logout(); navigate("/login"); };
  const storagePercent = parseFloat(user?.storagePercent || 0);
  const storageColor   = storagePercent > 90 ? "bg-accent-red" : storagePercent > 70 ? "bg-accent-amber" : "bg-brand";
  const displayName    = user?.displayName || user?.username;

  // Dynamic app name from branding
  const appName = branding?.appName || "VaultFS";

  const NavLinkItem = ({ to, icon: Icon, label, isTrash = false }) => (
    <NavLink
      to={to}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
          isActive
            ? isTrash
              ? "bg-red-900/15 text-accent-red border border-red-900/25"
              : "bg-brand/15 text-brand-glow border border-brand/20 shadow-glow-sm"
            : "text-gray-400 hover:text-white hover:bg-surface-3"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={15}
            className={
              isActive
                ? isTrash ? "text-accent-red" : "text-brand-glow"
                : "text-gray-500 group-hover:text-gray-300"
            }
          />
          <span>{label}</span>
          {isActive && (
            <ChevronRight
              size={12}
              className={`ml-auto ${isTrash ? "text-red-500/60" : "text-brand/60"}`}
            />
          )}
        </>
      )}
    </NavLink>
  );

  return (
    <div className="min-h-screen bg-surface-0 grid-bg flex">
      {/* Global announcement banner — floats above everything */}
      <AnnouncementBanner />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-surface-1 border-r border-surface-3 z-30 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0 lg:static lg:z-auto`}>

        {/* Logo */}
        <div className="p-6 border-b border-surface-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt={appName} className="h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-brand/20 border border-brand/30 flex items-center justify-center shadow-glow-sm"
                   style={branding?.primaryColor ? { borderColor: branding.primaryColor + "50" } : {}}>
                <Zap size={16} className="text-brand-glow" />
              </div>
            )}
            <div>
              <span className="font-display font-bold text-white text-lg tracking-tight">{appName}</span>
              <span className="block text-[10px] text-gray-600">v1.0 — Pro</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon, label }) => (
            <NavLinkItem key={to} to={to} icon={icon} label={label} />
          ))}

          <div className="border-t border-surface-3 my-2" />
          <NavLinkItem to={trashItem.to} icon={trashItem.icon} label={trashItem.label} isTrash />

          {/* Admin */}
          {user?.role === "admin" && (
            <>
              <div className="border-t border-surface-3 my-2" />
              {/* Admin panel link with portal badge */}
              <NavLink
                to="/admin"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                    isActive
                      ? "bg-amber-500/15 text-amber-300 border border-amber-500/20"
                      : "text-gray-400 hover:text-white hover:bg-surface-3"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Shield size={15} className={isActive ? "text-amber-400" : "text-gray-500"} />
                    <span className="flex-1">Admin Panel</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-900/40">
                      ADMIN
                    </span>
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        {/* Activity feed */}
        <div className="px-4 pb-2">
          <button
            onClick={() => { setActivityOpen(!activityOpen); setUnread(0); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activityOpen ? "bg-surface-3 text-white" : "text-gray-400 hover:text-white hover:bg-surface-3"
            }`}
          >
            <Activity size={15} className="text-gray-500" />
            <span>Live Activity</span>
            {unread > 0 && (
              <span className="ml-auto w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
        </div>

        {activityOpen && (
          <div className="mx-4 mb-2 card p-3 max-h-48 overflow-y-auto space-y-1.5 animate-fade-up">
            {activities.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-3">No recent activity</p>
            ) : (
              activities.map((a) => (
                <div key={a.id} className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">{ACTIVITY_ICONS[a.type] || "📌"}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-300 leading-snug">
                      {a.type === "upload"         && `Uploaded ${a.payload?.count} file(s)`}
                      {a.type === "delete"         && `Deleted ${a.payload?.fileName}`}
                      {a.type === "bulk_delete"    && `Deleted ${a.payload?.count} files`}
                      {a.type === "chunk_progress" && `Upload ${a.payload?.progress}%`}
                      {a.type === "banned"         && "Account suspended"}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Keyboard hint */}
        <div className="px-4 pb-2">
          <button
            onClick={() => setShowShortcuts(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            <Keyboard size={12} />
            <span>Keyboard shortcuts</span>
            <kbd className="ml-auto bg-surface-3 border border-surface-4 px-1.5 py-0.5 rounded text-[10px]">?</kbd>
          </button>
        </div>

        <div className="px-4 pb-2 grid grid-cols-2 gap-2">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="btn-ghost text-xs px-3 py-2 justify-center disabled:opacity-40"
          >
            Undo
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="btn-ghost text-xs px-3 py-2 justify-center disabled:opacity-40"
          >
            Redo
          </button>
        </div>

        {/* Email verification nudge */}
        {user && !user.emailVerified && (
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-amber-900/10 border border-amber-900/20">
            <p className="text-[10px] text-amber-400 leading-snug">
              ⚠ Email not verified.{" "}
              <button
                className="underline hover:no-underline"
                onClick={() => navigate("/settings")}
              >
                Verify now
              </button>
            </p>
          </div>
        )}

        {/* Storage + user */}
        <div className="p-4 border-t border-surface-3">
          <div className="bg-surface-2 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <HardDrive size={13} className="text-gray-500" />
              <span className="text-xs text-gray-500 font-medium">Storage</span>
              <span className="ml-auto text-xs text-gray-400 font-mono">{storagePercent}%</span>
            </div>
            <div className="h-1.5 bg-surface-4 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${storageColor}`}
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-gray-600">{formatBytes(user?.storageUsed)}</span>
              <span className="text-[10px] text-gray-600">{formatBytes(user?.storageLimit)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* BUG FIX: rounded-full + object-cover ensures perfectly circular avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden border border-surface-4 flex-shrink-0">
              {(user?.avatarUrl || user?.avatar) ? (
                <img
                  src={user.avatarUrl || user.avatar}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-brand/20 border border-brand/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-brand-glow">
                    {displayName?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-[10px] text-gray-500 truncate">
                {user?.role === "admin"
                  ? "👑 Admin"
                  : user?.twoFactorEnabled
                  ? "🔐 2FA on"
                  : user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Logout"
              className="text-gray-500 hover:text-accent-red transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>

          {/* Footer text from branding */}
          {branding?.footerText && (
            <p className="text-[9px] text-gray-700 text-center mt-3">{branding.footerText}</p>
          )}
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 bg-surface-1 border-b border-surface-3">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400 hover:text-white">
            <Menu size={20} />
          </button>
          <span className="font-display font-bold text-white">{appName}</span>
          {unread > 0 && (
            <span className="ml-auto w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
              {unread}
            </span>
          )}
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {showShortcuts && <KeyboardShortcuts onClose={() => setShowShortcuts(false)} />}
    </div>
  );
}
