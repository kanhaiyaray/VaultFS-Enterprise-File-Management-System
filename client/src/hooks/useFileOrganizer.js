import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";

const MAX_RECENT = 40;

function keyFor(userId, suffix) {
  return `vaultfs_${suffix}_${userId || "guest"}`;
}

export function useFileOrganizer(userId, files = []) {
  const [metadata, setMetadata] = useLocalStorage(keyFor(userId, "file_meta"), {});
  const [recentEntries, setRecentEntries] = useLocalStorage(keyFor(userId, "recent_files"), []);

  const getMeta = useCallback((fileId) => metadata[fileId] || {}, [metadata]);

  const updateMeta = useCallback((fileId, updates) => {
    setMetadata((prev) => {
      const current = prev[fileId] || {};
      const nextValue = typeof updates === "function" ? updates(current) : { ...current, ...updates };
      return { ...prev, [fileId]: nextValue };
    });
  }, [setMetadata]);

  const markRecent = useCallback((file) => {
    if (!file?._id) return;
    const entry = {
      id: file._id,
      name: file.originalName,
      viewedAt: new Date().toISOString(),
    };

    setRecentEntries((prev) => [
      entry,
      ...prev.filter((item) => item.id !== file._id),
    ].slice(0, MAX_RECENT));
  }, [setRecentEntries]);

  const recentIds = useMemo(
    () => recentEntries.map((entry) => entry.id),
    [recentEntries]
  );

  const recentFiles = useMemo(() => {
    const map = new Map(files.map((file) => [file._id, file]));
    return recentEntries
      .map((entry) => map.get(entry.id))
      .filter(Boolean);
  }, [files, recentEntries]);

  const filesWithMeta = useMemo(() => files.map((file) => ({
    ...file,
    organizer: metadata[file._id] || {},
  })), [files, metadata]);

  return {
    filesWithMeta,
    metadata,
    getMeta,
    updateMeta,
    recentEntries,
    recentFiles,
    recentIds,
    markRecent,
  };
}
