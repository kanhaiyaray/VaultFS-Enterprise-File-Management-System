import { createContext, useContext, useEffect, useState } from "react";
import api from "../utils/api";

/**
 * BrandingProvider
 *
 * Wrap your App in this to apply admin-configured branding:
 *   <BrandingProvider>
 *     <AuthProvider>
 *       <AppRoutes />
 *     </AuthProvider>
 *   </BrandingProvider>
 *
 * Usage anywhere:
 *   const { branding, loading } = useBranding();
 */

const BrandingContext = createContext({});

export function useBranding() {
  return useContext(BrandingContext);
}

const DEFAULT_BRANDING = {
  appName:      "VaultFS",
  primaryColor: "#7c3aed",
  accentColor:  "#06b6d4",
  tagline:      "Secure File Management",
  logoUrl:      null,
  faviconUrl:   null,
  footerText:   null,
  features:     {
    urlImport: true, publicGallery: true, twoFactor: true,
    teamCollaboration: true, fileRequests: true, officePreview: true, registration: true,
  },
  maintenanceMode:    false,
  maintenanceMessage: "",
};

export function BrandingProvider({ children }) {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [loading,  setLoading]  = useState(true);
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const allowDuringMaintenance = pathname.startsWith("/admin");

  // ── Improved fetch with error handling ──────────────────────────────────────
  useEffect(() => {
    fetch(`/api/branding?_t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return r.json();
      })
      .then(({ branding: b }) => {
        if (b) setBranding({ ...DEFAULT_BRANDING, ...b });
      })
      .catch((err) => {
        console.warn('[Branding] Failed to fetch branding:', err.message);
        // keep fallback defaults
      })
      .finally(() => setLoading(false));
  }, []);

  // Apply CSS variables whenever branding changes
  useEffect(() => {
    const root = document.documentElement;

    // Convert hex to HSL for Tailwind-compatible CSS vars
    const hexToHslParts = (hex) => {
      hex = hex.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    try {
      if (branding.primaryColor) {
        const hsl = hexToHslParts(branding.primaryColor);
        root.style.setProperty("--color-brand", branding.primaryColor);
        root.style.setProperty("--color-brand-hsl", hsl);
      }
      if (branding.accentColor) {
        root.style.setProperty("--color-accent", branding.accentColor);
      }
    } catch {}

    // Update document title
    if (branding.appName) {
      document.title = branding.appName;
    }

    // Update favicon
    if (branding.faviconUrl) {
      let link = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, loading, setBranding }}>
      {branding.maintenanceMode && !allowDuringMaintenance && (
        <MaintenanceBanner message={branding.maintenanceMessage} appName={branding.appName} />
      )}
      {children}
    </BrandingContext.Provider>
  );
}

function MaintenanceBanner({ message, appName }) {
  return (
    <div className="fixed inset-0 bg-surface-0 z-[9999] flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-900/20 border border-amber-900/30 flex items-center justify-center mx-auto">
          <span className="text-3xl">🔧</span>
        </div>
        <h1 className="font-display font-bold text-2xl text-white">{appName} is down for maintenance</h1>
        <p className="text-gray-400 leading-relaxed">{message || "We'll be back soon. Thanks for your patience."}</p>
        <p className="text-xs text-gray-600">If you're an admin, you can disable maintenance mode in the admin panel.</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  AdminBrandingEditor — use inside AdminPage branding tab
// ─────────────────────────────────────────────────────────────────────────────
export function AdminBrandingEditor() {
  const { branding, setBranding } = useBranding();
  const [form, setForm]           = useState(branding);
  const [saving, setSaving]       = useState(false);
  const [saved,  setSaved]        = useState(false);

  useEffect(() => { setForm(branding); }, [branding]);

  const update = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));
  const updateFeature = (key, val) =>
    setForm((prev) => ({ ...prev, features: { ...prev.features, [key]: val } }));

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const { data } = await api.put("/api/admin/branding", form);
      setBranding(data.branding);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // toast handled by caller
    } finally {
      setSaving(false);
    }
  };

  const FEATURE_LABELS = {
    urlImport:         "URL Import",
    publicGallery:     "Public Gallery",
    twoFactor:         "Two-Factor Auth",
    teamCollaboration: "Team Collaboration",
    fileRequests:      "File Requests",
    officePreview:     "Office Doc Preview",
    registration:      "New Registrations",
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Identity */}
      <div className="card p-5 space-y-4">
        <h3 className="font-display font-semibold text-white text-sm">Identity</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">App Name</label>
            <input className="input" value={form.appName} onChange={(e) => update("appName", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Tagline</label>
            <input className="input" value={form.tagline} onChange={(e) => update("tagline", e.target.value)} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Logo URL</label>
            <input className="input font-mono text-sm" placeholder="https://…/logo.png" value={form.logoUrl || ""} onChange={(e) => update("logoUrl", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Favicon URL</label>
            <input className="input font-mono text-sm" placeholder="https://…/favicon.ico" value={form.faviconUrl || ""} onChange={(e) => update("faviconUrl", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Footer Text</label>
          <input className="input" placeholder="© 2025 Your Company" value={form.footerText || ""} onChange={(e) => update("footerText", e.target.value)} />
        </div>
      </div>

      {/* Colors */}
      <div className="card p-5 space-y-4">
        <h3 className="font-display font-semibold text-white text-sm">Colors</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Primary Color</label>
            <div className="flex gap-2">
              <input type="color" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="w-10 h-10 rounded-lg border border-surface-4 bg-surface-2 cursor-pointer" />
              <input className="input flex-1 font-mono uppercase" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Accent Color</label>
            <div className="flex gap-2">
              <input type="color" value={form.accentColor} onChange={(e) => update("accentColor", e.target.value)} className="w-10 h-10 rounded-lg border border-surface-4 bg-surface-2 cursor-pointer" />
              <input className="input flex-1 font-mono uppercase" value={form.accentColor} onChange={(e) => update("accentColor", e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="card p-5 space-y-3">
        <h3 className="font-display font-semibold text-white text-sm">Feature Toggles</h3>
        {Object.entries(FEATURE_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between py-2 border-b border-surface-3 last:border-0">
            <span className="text-sm text-gray-300">{label}</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium transition-colors ${form.features?.[key] ? "text-brand-glow" : "text-gray-600"}`}>
                {form.features?.[key] ? "On" : "Off"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={!!form.features?.[key]}
                onClick={() => updateFeature(key, !form.features?.[key])}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
                  form.features?.[key] ? "bg-brand" : "bg-surface-4"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                    form.features?.[key] ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Maintenance */}
      <div className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-white text-sm">Maintenance Mode</h3>
            <p className="text-xs text-gray-500 mt-0.5">Locks the app for all non-admin users.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium transition-colors ${form.maintenanceMode ? "text-accent-amber" : "text-gray-600"}`}>
              {form.maintenanceMode ? "On" : "Off"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={!!form.maintenanceMode}
              onClick={() => update("maintenanceMode", !form.maintenanceMode)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full border-2 border-transparent cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
                form.maintenanceMode ? "bg-accent-amber" : "bg-surface-4"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                  form.maintenanceMode ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
        {form.maintenanceMode && (
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Maintenance Message</label>
            <input className="input" value={form.maintenanceMessage} onChange={(e) => update("maintenanceMessage", e.target.value)} />
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={saving} className="btn-primary px-6 py-2.5">
        {saving ? "Saving…" : saved ? "✓ Saved!" : "Save Branding"}
      </button>
    </div>
  );
}