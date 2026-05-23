/**
 * utils/helpers.js
 * Shared pure utility functions used across the VaultFS frontend.
 */

// ── Format bytes to human-readable string ────────────────────────────────────
export function formatBytes(bytes = 0) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// ── Format ISO date to readable string ───────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

// ── Format ISO date with time ─────────────────────────────────────────────────
export function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Truncate a long string with ellipsis ─────────────────────────────────────
export function truncate(str = "", max = 40) {
  return str.length <= max ? str : str.slice(0, max - 1) + "…";
}

// ── Return an emoji icon for a MIME type ─────────────────────────────────────
export function getFileIcon(mimetype = "") {
  if (mimetype.startsWith("image/"))  return "🖼️";
  if (mimetype.startsWith("video/"))  return "🎬";
  if (mimetype.startsWith("audio/"))  return "🎵";
  if (mimetype === "application/pdf") return "📄";
  if (mimetype.includes("zip") || mimetype.includes("archive")) return "📦";
  if (mimetype.includes("word") || mimetype.includes("document")) return "📝";
  if (mimetype.includes("excel") || mimetype.includes("sheet"))   return "📊";
  if (mimetype.includes("powerpoint") || mimetype.includes("presentation")) return "📋";
  if (mimetype.startsWith("text/"))   return "📃";
  return "📁";
}

// ── Build query string from an object, skipping empty values ─────────────────
export function buildQuery(params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") q.set(k, v);
  });
  return q.toString() ? `?${q.toString()}` : "";
}

// ── Debounce a function ───────────────────────────────────────────────────────
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ── Copy text to clipboard, returns true on success ──────────────────────────
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ── Relative time string (e.g. "3 days ago") ─────────────────────────────────
export function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (seconds < 60)   return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60)   return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)     return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30)      return `${days}d ago`;
  return formatDate(dateStr);
}
