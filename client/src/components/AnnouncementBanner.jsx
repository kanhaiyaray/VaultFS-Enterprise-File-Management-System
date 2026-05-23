/**
 * AnnouncementBanner
 *
 * Add this ONCE at the top level in Layout.jsx or App.jsx so it persists
 * across all pages. It listens on the socket for "announcement" events
 * and shows a dismissible banner + toast.
 *
 * Usage in Layout.jsx — add inside the returned JSX (above <main>):
 *   import AnnouncementBanner from "./AnnouncementBanner";
 *   ...
 *   <AnnouncementBanner />
 *   <main className="flex-1 overflow-y-auto">{children}</main>
 */
import { useState, useEffect } from "react";
import { Megaphone, X, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";
import toast from "react-hot-toast";

export default function AnnouncementBanner() {
  const { user }                  = useAuth();
  const { on, off }               = useSocket();
  const [announcements, setAnn]   = useState([]);  // stack of unread
  const [expanded,      setExp]   = useState({});  // id -> bool
  const [removingId,    setRemovingId] = useState("");

  useEffect(() => {
    let mounted = true;

    api.get("/api/announcements")
      .then(({ data }) => {
        if (!mounted) return;
        setAnn((data.announcements || []).slice(0, 5).map((ann) => ({
          ...ann,
          id: ann._id,
          timestamp: ann.createdAt || ann.timestamp,
        })));
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const handleAnnouncement = (data) => {
      if (data?.targetRole && data.targetRole !== user?.role) return;
      const id = data._id || Date.now().toString();
      setAnn((prev) => {
        const next = [{ ...data, id, timestamp: data.timestamp || data.createdAt }, ...prev.filter((ann) => (ann._id || ann.id) !== id)];
        return next.slice(0, 5);
      });
    };

    const handleRemoved = (data) => {
      const removedId = data?._id;
      if (!removedId) return;
      setAnn((prev) => prev.filter((ann) => (ann._id || ann.id) !== removedId));
    };

    on("announcement", handleAnnouncement);
    on("announcement_removed", handleRemoved);
    return () => {
      off("announcement", handleAnnouncement);
      off("announcement_removed", handleRemoved);
    };
  }, [on, off, user?.role]);

  const toggle  = (id) => setExp((prev) => ({ ...prev, [id]: !prev[id] }));

  const removeAnnouncement = async (id) => {
    if (user?.role !== "admin") return;
    setRemovingId(id);
    try {
      await api.delete(`/api/admin/announcements/${id}`);
      toast.success("Announcement removed.");
      setAnn((prev) => prev.filter((ann) => (ann._id || ann.id) !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove announcement.");
    } finally {
      setRemovingId("");
    }
  };

  if (!announcements.length) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 space-y-2 pointer-events-none">
      {announcements.map((ann) => (
        <div
          key={ann.id}
          className="pointer-events-auto bg-surface-1 border border-amber-900/40 rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-fade-up"
        >
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-amber-900/20 border border-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Megaphone size={14} className="text-accent-amber" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white truncate">
                  {ann.subject || "Announcement"}
                </p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {ann.message?.length > 100 && (
                    <button
                      onClick={() => toggle(ann.id)}
                      className="text-gray-500 hover:text-white transition-colors p-0.5"
                    >
                      {expanded[ann.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  )}
                  {user?.role === "admin" && (
                    <button
                      onClick={() => removeAnnouncement(ann._id || ann.id)}
                      className="text-gray-500 hover:text-white transition-colors p-0.5"
                      disabled={removingId === (ann._id || ann.id)}
                      title="Remove announcement"
                    >
                      {removingId === (ann._id || ann.id) ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                    </button>
                  )}
                </div>
              </div>
              <p className={`text-xs text-gray-400 mt-0.5 leading-relaxed ${
                !expanded[ann.id] && ann.message?.length > 100 ? "line-clamp-2" : ""
              }`}>
                {ann.message}
              </p>
              <p className="text-[10px] text-gray-600 mt-1">
                {new Date(ann.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
          {/* Amber accent bottom border */}
          <div className="h-0.5 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        </div>
      ))}
    </div>
  );
}
