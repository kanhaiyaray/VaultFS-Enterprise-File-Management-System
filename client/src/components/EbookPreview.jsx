import { useEffect, useRef, useState } from "react";
import { AlertCircle, BookOpen, Download, Loader2 } from "lucide-react";

async function loadEpubJs() {
  if (window.ePub) return window.ePub;

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/epubjs@0.3.93/dist/epub.min.js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  return window.ePub;
}

export default function EbookPreview({ file, downloadUrl }) {
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!downloadUrl || !viewerRef.current) return undefined;

    let mounted = true;
    let objectUrl = null;
    let rendition = null;
    let book = null;

    const render = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        const ePubFactory = await loadEpubJs();
        if (!mounted || !viewerRef.current) return;

        book = ePubFactory(objectUrl);
        rendition = book.renderTo(viewerRef.current, {
          width: "100%",
          height: 560,
          spread: "auto",
        });

        await rendition.display();
      } catch (err) {
        if (mounted) setError(err.message || "Failed to render ebook.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    render();

    return () => {
      mounted = false;
      try { rendition?.destroy?.(); } catch { /* noop */ }
      try { book?.destroy?.(); } catch { /* noop */ }
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [downloadUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 size={22} className="animate-spin text-brand-glow" />
        <p className="text-sm text-gray-500">Loading ebook preview...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="w-12 h-12 rounded-xl bg-red-900/15 border border-red-900/25 flex items-center justify-center">
          <AlertCircle size={20} className="text-accent-red" />
        </div>
        <div>
          <p className="text-sm text-gray-300">Could not render this EPUB inline.</p>
          <p className="text-xs text-gray-600 mt-1">{error}</p>
        </div>
        <a href={downloadUrl} download={file?.originalName} className="btn-primary px-4 py-2">
          <Download size={14} /> Download EPUB
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <BookOpen size={13} className="text-brand-glow" />
        EPUB preview
      </div>
      <div className="rounded-xl overflow-hidden border border-surface-4 bg-white">
        <div ref={viewerRef} />
      </div>
    </div>
  );
}
