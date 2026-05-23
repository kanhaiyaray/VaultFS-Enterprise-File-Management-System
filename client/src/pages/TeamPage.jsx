import { useState, useEffect } from "react";
import {
  Users, UserPlus, Mail, Shield, Trash2, RefreshCw,
  Crown, User, AlertCircle, CheckCircle2, Copy, Loader2,
} from "lucide-react";
import api from "../utils/api";
import { formatDate } from "../utils/helpers";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const ROLE_BADGES = {
  owner:  { label: "Owner",  color: "text-accent-amber bg-amber-900/20  border-amber-900/30",  icon: Crown },
  admin:  { label: "Admin",  color: "text-brand-glow bg-brand/10        border-brand/20",       icon: Shield },
  editor: { label: "Editor", color: "text-accent-green bg-green-900/15  border-green-900/25",   icon: User },
  viewer: { label: "Viewer", color: "text-gray-400    bg-surface-3      border-surface-4",      icon: User },
};

export default function TeamPage() {
  const { user } = useAuth();
  const [team,         setTeam]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [inviteEmail,  setInviteEmail]  = useState("");
  const [inviteRole,   setInviteRole]   = useState("viewer");
  const [inviting,     setInviting]     = useState(false);
  const [error,        setError]        = useState("");
  const [showCreate,   setShowCreate]   = useState(false);
  const [newTeamName,  setNewTeamName]  = useState("");
  const [creating,     setCreating]     = useState(false);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/team");
      setTeam(data.team || null);
    } catch {
      toast.error("Failed to load team.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTeam(); }, []);

  const canManageMembers = team?.owner === user?._id || team?.owner?._id === user?._id;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post("/api/team", { name: newTeamName.trim() });
      setTeam(data.team);
      setShowCreate(false);
      setNewTeamName("");
      toast.success("Team created!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create team.");
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setError(""); setInviting(true);
    try {
      await api.post(`/api/team/${team._id}/invite`, { email: inviteEmail.trim(), role: inviteRole });
      toast.success(`Invitation sent to ${inviteEmail}.`);
      setInviteEmail("");
      fetchTeam();
    } catch (err) {
      setError(err.response?.data?.message || "Invite failed.");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await api.delete(`/api/team/${team._id}/members/${memberId}`);
      toast.success("Member removed.");
      fetchTeam();
    } catch {
      toast.error("Failed to remove member.");
    }
  };

  const handleChangeRole = async (memberId, role) => {
    try {
      await api.put(`/api/team/${team._id}/members/${memberId}`, { role });
      toast.success("Role updated.");
      fetchTeam();
    } catch {
      toast.error("Failed to update role.");
    }
  };

  const copyInviteLink = () => {
    if (!team?.inviteCode) return;
    navigator.clipboard.writeText(`${window.location.origin}/join-team/${team.inviteCode}`);
    toast.success("Invite link copied!");
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        <div className="h-8 w-32 skeleton rounded-lg" />
        <div className="card h-48 skeleton" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/20 flex items-center justify-center">
            <Users size={16} className="text-brand-glow" />
          </div>
          <h1 className="font-display font-bold text-xl text-white">Team</h1>
        </div>
        <button onClick={fetchTeam} className="btn-ghost text-sm px-3 py-2">
          <RefreshCw size={13} />
        </button>
      </div>

      {!team ? (
        /* No team yet */
        <div className="card p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-3 border border-surface-4 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-gray-600" />
          </div>
          <p className="text-white font-display font-semibold text-lg mb-2">No team yet</p>
          <p className="text-gray-500 text-sm mb-6">Create a team to collaborate on files with others.</p>
          {!showCreate ? (
            <button onClick={() => setShowCreate(true)} className="btn-primary justify-center">
              <UserPlus size={16} /> Create a Team
            </button>
          ) : (
            <form onSubmit={handleCreate} className="max-w-xs mx-auto space-y-3">
              <input
                autoFocus type="text" required maxLength={50}
                placeholder="Team name"
                className="input text-center"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary flex-1 justify-center">
                  {creating ? <Loader2 size={14} className="animate-spin" /> : "Create"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <>
          {/* Team header */}
          <div className="card p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-bold text-lg text-white">{team.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{team.members?.length || 0} member{(team.members?.length || 0) !== 1 ? "s" : ""}</p>
              </div>
              {team.inviteCode && (
                <button onClick={copyInviteLink} className="btn-ghost text-xs flex items-center gap-1.5">
                  <Copy size={12} /> Copy invite link
                </button>
              )}
            </div>
          </div>

          {/* Invite form */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <UserPlus size={15} className="text-brand-glow" /> Invite Member
            </h3>
            {error && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-900/20 border border-red-900/30 text-accent-red text-xs mb-3">
                <AlertCircle size={13} /> {error}
              </div>
            )}
            <form onSubmit={handleInvite} className="flex gap-2">
              <div className="relative flex-1">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email" required
                  placeholder="colleague@company.com"
                  className="input pl-9"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="input w-28 cursor-pointer"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
              <button type="submit" disabled={inviting} className="btn-primary px-4">
                {inviting ? <Loader2 size={14} className="animate-spin" /> : "Invite"}
              </button>
            </form>
          </div>

          {/* Members list */}
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-surface-3">
              <h3 className="text-sm font-semibold text-white">Members</h3>
            </div>
            <div className="divide-y divide-surface-3">
              {(team.members || []).map((member) => {
                const role = ROLE_BADGES[member.role] || ROLE_BADGES.viewer;
                const RoleIcon = role.icon;
                const isMe = member.userId === user?._id || member.userId?._id === user?._id;
                return (
                  <div key={member._id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-brand-glow">
                        {(member.displayName || member.username || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {member.displayName || member.username}
                        {isMe && <span className="ml-1.5 text-[10px] text-gray-500">(you)</span>}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{member.email}</p>
                    </div>
                    <span className={`badge border text-[10px] ${role.color}`}>
                      <RoleIcon size={10} /> {role.label}
                    </span>
                    {!isMe && canManageMembers && (
                      <div className="flex items-center gap-1">
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member._id, e.target.value)}
                          className="text-xs bg-surface-3 border border-surface-4 text-gray-300 rounded-md px-2 py-1 cursor-pointer"
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member._id)}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-accent-red hover:bg-red-900/15 transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
