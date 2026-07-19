import axios from "axios";

// ── Read base URL from environment ─────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// In development, log a warning if VITE_API_URL is not set
if (import.meta.env.DEV && !API_BASE_URL) {
  console.warn(
    "[VaultFS] VITE_API_URL is not set in .env. API requests will be sent to the same origin (relative URLs). " +
    "For cross-origin or production setups, set VITE_API_URL to your backend URL."
  );
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60_000,
});

// ── Request interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.method === 'get') {
    // ✅ REMOVED explicit Cache-Control header – _t is enough for cache busting
    config.params = { ...config.params, _t: Date.now() };
  }
  return config;
});

// ── Helper: recursively convert relative URLs to absolute ──────────────────
function transformUrls(obj, baseURL) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => transformUrls(item, baseURL));
  }
  const result = { ...obj };
  const urlKeys = ['url', 'thumbnailUrl', 'signedUrl', 'downloadUrl', 'previewUrl', 'avatarUrl', 'logoUrl', 'faviconUrl'];
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === 'string' && urlKeys.includes(key) && value.startsWith('/')) {
      if (baseURL) {
        result[key] = new URL(value, baseURL).href;
      } else {
        result[key] = value;
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = transformUrls(value, baseURL);
    }
  }
  return result;
}

// ── Response interceptor ──────────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => {
    if (res.data) {
      res.data = transformUrls(res.data, api.defaults.baseURL);
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith("/s/") && !currentPath.startsWith("/r/")) {
        localStorage.removeItem("token");
        if (!currentPath.startsWith("/login") && !currentPath.startsWith("/register") && !currentPath.startsWith("/admin/login")) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
export { api };