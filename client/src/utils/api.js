import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  timeout: 60_000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.method === 'get') {
    config.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
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
  // These keys are likely to contain URLs
  const urlKeys = ['url', 'thumbnailUrl', 'signedUrl', 'downloadUrl', 'previewUrl'];
  for (const key of Object.keys(result)) {
    const value = result[key];
    if (typeof value === 'string' && urlKeys.includes(key) && value.startsWith('/')) {
      result[key] = new URL(value, baseURL).href;
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