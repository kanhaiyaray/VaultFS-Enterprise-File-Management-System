/**
 * WebhooksPage (or tab inside SettingsPage)
 *
 * Displays and manages the user's webhooks.
 * Mount at /settings with a tab, or as its own page at /webhooks.
 *
 * Add to App.jsx:
 *   import WebhooksTab from "../components/WebhooksTab";
 *   // In SettingsPage, render <WebhooksTab /> under a "Webhooks" tab.
 */
import { useState, useEffect, useCallback } from "react";
import {
  Webhook, Plus, Trash2, Send, CheckCircle2, AlertCircle,
  Loader2, RefreshCw, Edit3, Copy, Check, ExternalLink,
  Activity, Clock, X, Eye, EyeOff,
} from "lucide-react";
import api from "../utils/api";
import { formatDate } from "../utils/helpers";
import toast from "react-hot-toast";

const EVENTS = [
  { value: "file.uploaded",   label: "File Uploaded"   },
  { value: "file.deleted",    label: "File Deleted"    },
  { value: "file.downloaded", label: "File Downloaded" },
  { value: "file.shared",     label: "File Shared"     },
  { value: "file.restored",   label: "File Restored"   },
  { value: "file.starred",    label: "File Starred"    },
];

const BLANK = { name: "", url: "", secret: "", events: ["file.uploaded"] };

function StatusDot({ code }) {
  if (!code && code !== 0) return <span className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />;
  const ok = code >= 200 && code < 300;
  return (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? "bg-emerald-400" : code === 0 ? "bg-gray-500" : "bg-accent-red"}`}
      title={code ? `Last response: HTTP ${code}` : "Never fired"}
    />
  );
}

function WebhookForm({ initial = BLANK, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial);
  const [showSecret, setShowSecret] = useState(false);

  const toggle = (ev) => setForm((p) => ({
    ...p,
    events: p.events.includes(ev) ? p.events.filter((e) => e !== ev) : [...p.events, ev],
  }));

  return (
    <div className="card p-5 space-y-4 animate-fade-up">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Name *</label>
          <input className="input" placeholder="My Webhook" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Endpoint URL *</label>
          <input className="input font-mono text-sm" placeholder="https://…/webhook" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Secret (HMAC-SHA256, optional)</label>
        <div className="relative">
          <input
            type={showSecret ? "text" : "password"}
            className="input font-mono text-sm pr-9"
            placeholder="Signing secret"
            value={form.secret}
            onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))}
          />
          <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
            {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
        <p className="text-[11px] text-gray-600 mt-1">
          If set, we'll sign each request with an <code className="text-xs text-gray-400">X-VaultFS-Signature</code> header.
        </p>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-2">Trigger Events *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {EVENTS.map((ev) => (
            <button
              key={ev.value}
              type="button"
              onClick={() => toggle(ev.value)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-all text-left ${
                form.events.includes(ev.value)
                  ? "bg-brand/15 border-brand/30 text-brand-glow"
                  : "bg-surface-2 border-surface-4 text-gray-400 hover:text-white"
              }`}
            >
              <span className={`w-3 h-3 rounded border flex-shrink-0 flex items-center justify-center ${
                form.events.includes(ev.value) ? "bg-brand border-brand" : "border-surface-5"
              }`}>
                {form.events.includes(ev.value) && <Check size={8} className="text-white" />}
              </span>
              {ev.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1">Cancel</button>
        <button
          type="button"
          onClick={() => onSubmit(form)}
          disabled={loading || !form.name || !form.url || !form.events.length}
          className="btn-primary flex-1 justify-center"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {initial._id ? "Save Changes" : "Create Webhook"}
        </button>
      </div>
    </div>
  );
}

export default function WebhooksTab() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [testing,  setTesting]  = useState(null);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/webhooks");
      setWebhooks(data.webhooks);
    } catch { toast.error("Failed to load webhooks."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  const handleCreate = async (form) => {
    setCreating(true);
    try {
      await api.post("/api/webhooks", form);
      toast.success("Webhook created!");
      setShowForm(false);
      fetchWebhooks();
    } catch (err) { toast.error(err.response?.data?.message || "Create failed."); }
    finally { setCreating(false); }
  };

  const handleUpdate = async (form) => {
    try {
      await api.put(`/api/webhooks/${editId}`, form);
      toast.success("Webhook updated.");
      setEditId(null);
      fetchWebhooks();
    } catch (err) { toast.error(err.response?.data?.message || "Update failed."); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this webhook?")) return;
    try {
      await api.delete(`/api/webhooks/${id}`);
      toast.success("Webhook deleted.");
      fetchWebhooks();
    } catch { toast.error("Delete failed."); }
  };

  const handleTest = async (id) => {
    setTesting(id);
    try {
      const { data } = await api.post(`/api/webhooks/${id}/test`);
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
      fetchWebhooks();
    } catch (err) { toast.error(err.response?.data?.message || "Test failed."); }
    finally { setTesting(null); }
  };

  const toggleActive = async (wh) => {
    try {
      await api.put(`/api/webhooks/${wh._id}`, { isActive: !wh.isActive });
      fetchWebhooks();
    } catch { toast.error("Failed to toggle."); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-white flex items-center gap-2">
            <Webhook size={16} className="text-brand-glow" /> Webhooks
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Get notified at your URL when file events happen. Max 10 webhooks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchWebhooks} className="btn-ghost px-2.5 py-2">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => { setShowForm(true); setEditId(null); }}
            disabled={webhooks.length >= 10}
            className="btn-primary text-sm px-3 py-2"
          >
            <Plus size={14} /> New Webhook
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && !editId && (
        <WebhookForm loading={creating} onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {/* Webhook cards */}
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 size={20} className="animate-spin text-brand-glow" /></div>
      ) : webhooks.length === 0 && !showForm ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-3 border border-surface-4 flex items-center justify-center mx-auto mb-4">
            <Webhook size={26} className="text-gray-600" />
          </div>
          <p className="text-gray-400 font-medium mb-1">No webhooks yet</p>
          <p className="text-gray-600 text-sm">Create a webhook to get real-time notifications at your endpoint.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh._id} className="card p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-start gap-3">
                <StatusDot code={wh.lastStatusCode} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-200">{wh.name}</p>
                    {!wh.isActive && (
                      <span className="badge bg-surface-3 text-gray-500 border-surface-4 text-[10px]">Disabled</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 font-mono truncate mt-0.5">{wh.url}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Pill toggle — Enable / Disable */}
                  <div
                    className="flex items-center gap-1.5 cursor-pointer"
                    onClick={() => toggleActive(wh)}
                    title={wh.isActive ? "Disable webhook" : "Enable webhook"}
                  >
                    <span className={`text-xs font-medium transition-colors ${wh.isActive ? "text-brand-glow" : "text-gray-600"}`}>
                      {wh.isActive ? "Enabled" : "Disabled"}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!wh.isActive}
                      onClick={(e) => { e.stopPropagation(); toggleActive(wh); }}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
                        wh.isActive ? "bg-brand" : "bg-surface-4"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                          wh.isActive ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <button
                    onClick={() => handleTest(wh._id)}
                    disabled={testing === wh._id}
                    title="Test webhook"
                    className="p-1.5 rounded text-gray-500 hover:text-brand-glow hover:bg-brand/10 transition-all"
                  >
                    {testing === wh._id ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  </button>

                  <button
                    onClick={() => { setEditId(wh._id); setShowForm(false); }}
                    title="Edit"
                    className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-surface-3 transition-all"
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    onClick={() => handleDelete(wh._id)}
                    title="Delete"
                    className="p-1.5 rounded text-gray-500 hover:text-accent-red hover:bg-red-900/10 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Edit form */}
              {editId === wh._id && (
                <WebhookForm
                  initial={{ ...wh, secret: "" }}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditId(null)}
                  loading={false}
                />
              )}

              {/* Events + stats */}
              <div className="flex items-center gap-3 flex-wrap pt-1 border-t border-surface-3">
                <div className="flex gap-1 flex-wrap">
                  {wh.events.map((ev) => (
                    <span key={ev} className="badge bg-surface-3 text-gray-400 border-surface-4 text-[10px]">
                      {EVENTS.find((e) => e.value === ev)?.label || ev}
                    </span>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-3 text-[10px] text-gray-600">
                  <span className="flex items-center gap-1">
                    <Activity size={9} /> {wh.totalFired} fired
                  </span>
                  {wh.failureCount > 0 && (
                    <span className="flex items-center gap-1 text-accent-red">
                      <AlertCircle size={9} /> {wh.failureCount} failed
                    </span>
                  )}
                  {wh.lastFiredAt && (
                    <span className="flex items-center gap-1">
                      <Clock size={9} /> {formatDate(wh.lastFiredAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Docs */}
      <div className="card p-4 space-y-2">
        <p className="text-xs font-semibold text-gray-400">Signature Verification</p>
        <p className="text-xs text-gray-600 leading-relaxed">
          Each request includes an <code className="text-gray-400 bg-surface-3 px-1 rounded">X-VaultFS-Signature</code> header.
          Verify in your endpoint with HMAC-SHA256 using your secret.
        </p>
        <pre className="text-[11px] text-gray-400 bg-surface-0 border border-surface-4 rounded-lg p-3 overflow-x-auto font-mono">
{`// Node.js example
const crypto = require("crypto");
const sig = req.headers["x-vaultfs-signature"];
const expected = "sha256=" + crypto
  .createHmac("sha256", YOUR_SECRET)
  .update(JSON.stringify(req.body))
  .digest("hex");
if (sig !== expected) return res.status(401).end();`}
        </pre>
      </div>
    </div>
  );
}
