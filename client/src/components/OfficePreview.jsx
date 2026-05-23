import { useState, useEffect, useRef } from "react";
import { Loader2, AlertCircle, FileText, Download, RefreshCw } from "lucide-react";

/**
 * OfficePreview — renders DOCX, XLSX, PPTX inline in the browser.
 *
 * Dependencies (add to package.json):
 *   "mammoth": "^1.7.0"        (for DOCX)
 *   "xlsx":    "^0.18.5"       (for XLSX / CSV)
 *
 * Usage inside FilePreviewModal:
 *   <OfficePreview file={file} />
 *
 * The component fetches the file blob via a signed URL or direct download
 * then processes client-side.
 */

const MIME_TYPES = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xlsx",
  "text/csv": "csv",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "pptx",
};

// ─────────────────────────────────────────────────────────────────────────────
//  DOCX Preview using mammoth.js (loaded from CDN)
// ─────────────────────────────────────────────────────────────────────────────
function DocxPreview({ arrayBuffer }) {
  const [html, setHtml]       = useState("");
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;

    const convert = async () => {
      try {
        // Lazy-load mammoth from CDN if not already loaded
        if (!window.mammoth) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.7.0/mammoth.browser.min.js";
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }
        const result = await window.mammoth.convertToHtml({ arrayBuffer });
        if (!cancelled) {
          setHtml(result.value);
        }
      } catch (err) {
        if (!cancelled) setError("Failed to render document: " + err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    convert();
    return () => { cancelled = true; };
  }, [arrayBuffer]);

  if (loading) return <LoadingSpinner label="Rendering document…" />;
  if (error)   return <ErrorBlock message={error} />;

  return (
    <div className="overflow-auto max-h-[60vh] rounded-lg bg-white text-black">
      <div
        className="p-6 prose prose-sm max-w-none leading-relaxed"
        style={{ fontFamily: "'Georgia', serif" }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  XLSX / CSV Preview using SheetJS
// ─────────────────────────────────────────────────────────────────────────────
function SheetPreview({ arrayBuffer, isCSV = false }) {
  const [sheets,       setSheets]       = useState([]);
  const [activeSheet,  setActiveSheet]  = useState(0);
  const [sheetData,    setSheetData]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        if (!window.XLSX) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }

        const data    = new Uint8Array(arrayBuffer);
        const workbook = window.XLSX.read(data, { type: "array" });

        if (!cancelled) {
          setSheets(workbook.SheetNames);
          const ws = workbook.Sheets[workbook.SheetNames[0]];
          const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
          setSheetData(rows);
        }
      } catch (err) {
        if (!cancelled) setError("Failed to parse spreadsheet: " + err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [arrayBuffer]);

  const switchSheet = (idx) => {
    if (!window.XLSX) return;
    const workbook = window.XLSX._lastWorkbook; // Not ideal; re-parse if needed
    setActiveSheet(idx);
  };

  if (loading) return <LoadingSpinner label="Parsing spreadsheet…" />;
  if (error)   return <ErrorBlock message={error} />;

  const headers = sheetData[0] || [];
  const rows    = sheetData.slice(1);

  return (
    <div className="space-y-3">
      {/* Sheet tabs */}
      {sheets.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {sheets.map((name, i) => (
            <button
              key={name}
              onClick={() => setActiveSheet(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 border transition-all ${
                activeSheet === i
                  ? "bg-brand/15 border-brand/30 text-brand-glow"
                  : "bg-surface-2 border-surface-4 text-gray-400 hover:text-white"
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto max-h-[55vh] rounded-lg border border-surface-4">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 bg-surface-2 border-b border-surface-4">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className="px-3 py-2 text-left font-semibold text-gray-300 whitespace-nowrap border-r border-surface-4 last:border-r-0"
                >
                  {String(h) || `Col ${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 500).map((row, ri) => (
              <tr
                key={ri}
                className={`border-b border-surface-4 last:border-b-0 ${
                  ri % 2 === 0 ? "bg-surface-0" : "bg-surface-1"
                }`}
              >
                {headers.map((_, ci) => (
                  <td
                    key={ci}
                    className="px-3 py-2 text-gray-400 whitespace-nowrap border-r border-surface-4 last:border-r-0 max-w-[200px] truncate"
                    title={String(row[ci] ?? "")}
                  >
                    {String(row[ci] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 500 && (
          <p className="text-center text-xs text-gray-600 p-3">
            Showing first 500 rows of {rows.length} total.
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PPTX — basic slide text extraction (no visual rendering without a server)
// ─────────────────────────────────────────────────────────────────────────────
function PptxPreview({ arrayBuffer }) {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const parse = async () => {
      try {
        // Use JSZip to unzip PPTX and extract slide XML text
        if (!window.JSZip) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
          });
        }

        const zip = await window.JSZip.loadAsync(arrayBuffer);
        const slideFiles = Object.keys(zip.files)
          .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .sort((a, b) => {
            const na = parseInt(a.match(/\d+/)?.[0] || 0);
            const nb = parseInt(b.match(/\d+/)?.[0] || 0);
            return na - nb;
          });

        const parsed = await Promise.all(
          slideFiles.map(async (name, i) => {
            const xml = await zip.files[name].async("string");
            // Extract all <a:t> text nodes
            const texts = [...xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)]
              .map((m) => m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim())
              .filter(Boolean);
            return { index: i + 1, texts };
          })
        );

        setSlides(parsed);
      } catch (err) {
        setError("Could not parse slides: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    parse();
  }, [arrayBuffer]);

  if (loading) return <LoadingSpinner label="Parsing slides…" />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
      {slides.map((slide) => (
        <div key={slide.index} className="card p-4">
          <p className="text-xs font-semibold text-brand-glow mb-2 uppercase tracking-wider">
            Slide {slide.index}
          </p>
          {slide.texts.length ? (
            <div className="space-y-1">
              {slide.texts.map((t, i) => (
                <p key={i} className="text-sm text-gray-300">{t}</p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-600 italic">No text content</p>
          )}
        </div>
      ))}
      {slides.length === 0 && (
        <p className="text-center text-gray-500 text-sm py-8">No slides found.</p>
      )}
      <p className="text-xs text-gray-600 text-center pb-2">
        Showing text content only. Download the file to view full formatting.
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────
const LoadingSpinner = ({ label }) => (
  <div className="flex flex-col items-center justify-center py-12 gap-3">
    <Loader2 size={24} className="animate-spin text-brand-glow" />
    <p className="text-sm text-gray-500">{label}</p>
  </div>
);

const ErrorBlock = ({ message, onRetry }) => (
  <div className="flex flex-col items-center gap-3 py-10 text-center">
    <div className="w-12 h-12 rounded-xl bg-red-900/15 border border-red-900/25 flex items-center justify-center">
      <AlertCircle size={22} className="text-accent-red" />
    </div>
    <p className="text-sm text-gray-400 max-w-xs">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="btn-ghost text-xs px-3 py-2">
        <RefreshCw size={12} /> Retry
      </button>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Main OfficePreview
// ─────────────────────────────────────────────────────────────────────────────
export default function OfficePreview({ file, downloadUrl }) {
  const [arrayBuffer, setBuffer] = useState(null);
  const [loading,     setLoading] = useState(true);
  const [error,       setError]   = useState(null);

  const docType = MIME_TYPES[file?.mimetype] || null;

  useEffect(() => {
    if (!file || !docType || !downloadUrl) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(downloadUrl, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.arrayBuffer();
      })
      .then(setBuffer)
      .catch((err) => {
        if (err.name !== "AbortError") setError("Failed to load file: " + err.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [file?._id, downloadUrl, docType]);

  if (!docType) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <FileText size={32} className="text-gray-600" />
        <p className="text-sm text-gray-500">Preview not available for this file type.</p>
      </div>
    );
  }

  if (loading) return <LoadingSpinner label={`Loading ${docType.toUpperCase()}…`} />;
  if (error)   return <ErrorBlock message={error} />;
  if (!arrayBuffer) return null;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <span className="badge bg-brand/15 text-brand-glow border border-brand/20 uppercase text-[10px] tracking-wider">
          {docType} preview
        </span>
        {downloadUrl && (
          <a
            href={downloadUrl}
            download={file.originalName}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
          >
            <Download size={12} /> Download for full view
          </a>
        )}
      </div>

      {docType === "docx" && <DocxPreview arrayBuffer={arrayBuffer} />}
      {(docType === "xlsx" || docType === "csv") && <SheetPreview arrayBuffer={arrayBuffer} isCSV={docType === "csv"} />}
      {docType === "pptx" && <PptxPreview arrayBuffer={arrayBuffer} />}
    </div>
  );
}

// Export type checker helper
export { MIME_TYPES };
