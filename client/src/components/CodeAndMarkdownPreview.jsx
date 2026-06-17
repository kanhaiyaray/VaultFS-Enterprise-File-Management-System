/**
 * CodeAndMarkdownPreview
 *
 * Handles:
 *   - Syntax-highlighted code for 30+ languages (Prism.js via CDN)
 *   - Markdown rendered as HTML (marked.js via CDN)
 *   - Live markdown editor with split-pane preview />
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Copy, Check, Download, ChevronRight, Eye, Edit3, Columns,
  Loader2, WrapText, Maximize2, Code2,
} from "lucide-react";
import toast from "react-hot-toast";
import DOMPurify from 'dompurify'; // <-- Added for sanitization

// ── Language detection from filename ─────────────────────────────────────────
const EXT_LANG_MAP = {
  js:   "javascript", jsx: "jsx",   ts:   "typescript", tsx: "tsx",
  py:   "python",     rb:  "ruby",  go:   "go",         rs:  "rust",
  java: "java",       kt:  "kotlin",php:  "php",        cs:  "csharp",
  cpp:  "cpp",        c:   "c",     h:    "c",           sh:  "bash",
  bash: "bash",       zsh: "bash",  sql:  "sql",         html:"html",
  xml:  "xml",        css: "css",   scss: "scss",        json:"json",
  yaml: "yaml",       yml:"yaml",   toml: "toml",        md:  "markdown",
  env:  "bash",       dockerfile:"docker", graphql:"graphql",
  tf:   "hcl",        lua: "lua",   swift:"swift",       dart:"dart",
};

export function detectLanguage(filename = "") {
  const ext = filename.split(".").pop()?.toLowerCase();
  return EXT_LANG_MAP[ext] || "plaintext";
}

// ── Prism.js loader (CDN) ─────────────────────────────────────────────────────
async function loadPrism() {
  if (window.Prism) return window.Prism;

  await new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel   = "stylesheet";
    css.href  = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css";
    document.head.appendChild(css);

    const script = document.createElement("script");
    script.src   = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js";
    script.onload  = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });

  // Load additional languages bundle
  await new Promise((resolve) => {
    const s = document.createElement("script");
    s.src   = "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js";
    s.onload = resolve;
    document.head.appendChild(s);
  });

  if (window.Prism?.plugins?.autoloader) {
    window.Prism.plugins.autoloader.languages_path =
      "https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/";
  }

  return window.Prism;
}

// ── marked.js loader (CDN) ───────────────────────────────────────────────────
async function loadMarked() {
  if (window.marked) return window.marked;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src   = "https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js";
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  // Configure marked for safety
  window.marked.setOptions({ breaks: true, gfm: true });
  return window.marked;
}

// ── CodePreview ───────────────────────────────────────────────────────────────
export function CodePreview({ content = "", language: langProp, filename = "", downloadUrl }) {
  const language     = langProp || detectLanguage(filename);
  const codeRef      = useRef(null);
  const [copied,     setCopied]  = useState(false);
  const [highlighted, setHL]     = useState(false);
  const [wrap,        setWrap]   = useState(false);
  const [loading,     setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadPrism().then((Prism) => {
      if (!cancelled && codeRef.current) {
        codeRef.current.innerHTML = content
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        // Update class so autoloader picks up the language
        codeRef.current.className = `language-${language}`;
        codeRef.current.parentElement.className = `language-${language}`;

        Prism.highlightElement(codeRef.current);
        setHL(true);
        setLoading(false);
      }
    }).catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [content, language]);

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast.success("Code copied!");
  };

  const lineCount = content.split("\n").length;

  return (
    <div className="rounded-xl overflow-hidden border border-surface-4 bg-[#1d1f21] font-mono text-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-surface-2 border-b border-surface-4">
        <div className="flex items-center gap-2">
          <Code2 size={13} className="text-brand-glow" />
          <span className="text-xs text-gray-400 font-sans">{filename || "Code"}</span>
          <span className="badge bg-surface-3 text-gray-500 text-[10px] border border-surface-4">
            {language}
          </span>
          <span className="text-[10px] text-gray-600 font-sans">{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWrap(!wrap)}
            title="Toggle word wrap"
            className={`p-1.5 rounded transition-colors ${wrap ? "text-brand-glow" : "text-gray-500 hover:text-white"}`}
          >
            <WrapText size={13} />
          </button>
          {downloadUrl && (
            <a
              href={downloadUrl}
              download={filename}
              className="p-1.5 rounded text-gray-500 hover:text-white transition-colors"
              title="Download"
            >
              <Download size={13} />
            </a>
          )}
          <button
            onClick={copy}
            className={`p-1.5 rounded transition-colors ${copied ? "text-emerald-400" : "text-gray-500 hover:text-white"}`}
            title="Copy code"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
        </div>
      </div>

      {/* Code area with line numbers */}
      <div className="relative overflow-auto max-h-[480px]">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1d1f21] z-10">
            <Loader2 size={18} className="animate-spin text-gray-500" />
          </div>
        )}
        <div className="flex">
          {/* Line numbers */}
          <div className="select-none flex-shrink-0 px-3 py-4 text-right text-gray-600 text-xs leading-5 border-r border-surface-4 bg-[#1a1c1e] min-w-[3rem]">
            {content.split("\n").map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          {/* Code */}
          <pre
            className="flex-1 overflow-x-auto p-4 m-0 bg-[#1d1f21] leading-5"
            style={{ whiteSpace: wrap ? "pre-wrap" : "pre", wordBreak: wrap ? "break-all" : "normal" }}
          >
            <code ref={codeRef} className={`language-${language} text-xs`}>
              {!highlighted ? content : ""}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
}

// ── MarkdownPreview ───────────────────────────────────────────────────────────
export function MarkdownPreview({ content: initialContent = "", editable = false, onSave, filename }) {
  const [view,    setView]    = useState("preview");  // "preview" | "edit" | "split"
  const [content, setContent] = useState(initialContent);
  const [html,    setHtml]    = useState("");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [copied,  setCopied]  = useState(false);

  // Parse markdown whenever content changes
  useEffect(() => {
    let cancelled = false;
    loadMarked().then((marked) => {
      if (!cancelled) {
        const rawHtml = marked.parse(content);
        // 🔒 Sanitize the rendered HTML with extra safety options
        const sanitized = DOMPurify.sanitize(rawHtml, {
          USE_PROFILES: { html: true },
          FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
          FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
        });
        setHtml(sanitized);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [content]);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(content);
      toast.success("Saved!");
    } catch {
      toast.error("Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    toast.success("Copied!");
  };

  const VIEWS = editable
    ? [{ id: "preview", icon: Eye, label: "Preview" }, { id: "edit", icon: Edit3, label: "Edit" }, { id: "split", icon: Columns, label: "Split" }]
    : [{ id: "preview", icon: Eye, label: "Preview" }];

  const RenderedHTML = () => (
    <div
      className="prose prose-invert prose-sm max-w-none p-5 leading-relaxed overflow-auto max-h-[520px]
        prose-headings:font-display prose-headings:text-white
        prose-p:text-gray-300 prose-a:text-brand-glow prose-code:text-pink-300
        prose-pre:bg-[#1d1f21] prose-pre:border prose-pre:border-surface-4
        prose-blockquote:border-l-brand prose-blockquote:text-gray-400
        prose-table:text-gray-300 prose-th:text-gray-200 prose-td:border-surface-4
        prose-img:rounded-lg prose-img:border prose-img:border-surface-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );

  return (
    <div className="rounded-xl overflow-hidden border border-surface-4 bg-surface-1">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-surface-2 border-b border-surface-4">
        <div className="flex items-center gap-1 bg-surface-3 border border-surface-4 rounded-lg p-0.5">
          {VIEWS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === id ? "bg-surface-1 text-white shadow-sm" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon size={11} /> {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {filename && <span className="text-xs text-gray-600 font-sans">{filename}</span>}
          <button onClick={copy} className={`p-1.5 rounded transition-colors ${copied ? "text-emerald-400" : "text-gray-500 hover:text-white"}`}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>
          {editable && onSave && (
            <button
              onClick={handleSave}
              disabled={saving || content === initialContent}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/15 border border-brand/25 text-brand-glow hover:bg-brand/25 transition-all text-xs font-medium disabled:opacity-40"
            >
              {saving ? <Loader2 size={11} className="animate-spin" /> : null}
              Save
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={20} className="animate-spin text-brand-glow" />
        </div>
      ) : (
        <>
          {view === "preview" && <RenderedHTML />}
          {view === "edit" && (
            <textarea
              className="w-full p-5 bg-surface-0 text-gray-300 text-sm font-mono resize-none outline-none leading-6 min-h-[480px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              spellCheck={false}
              placeholder="Write markdown here…"
            />
          )}
          {view === "split" && (
            <div className="grid grid-cols-2 divide-x divide-surface-4 min-h-[480px]">
              <textarea
                className="p-4 bg-surface-0 text-gray-300 text-xs font-mono resize-none outline-none leading-5"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                spellCheck={false}
              />
              <RenderedHTML />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Default export: smart router ──────────────────────────────────────────────
export default function CodeAndMarkdownPreview({ file, content, downloadUrl }) {
  if (!content) return null;

  const ext = file?.originalName?.split(".").pop()?.toLowerCase();

  if (ext === "md" || ext === "mdx") {
    return <MarkdownPreview content={content} filename={file?.originalName} downloadUrl={downloadUrl} />;
  }

  return (
    <CodePreview
      content={content}
      language={detectLanguage(file?.originalName)}
      filename={file?.originalName}
      downloadUrl={downloadUrl}
    />
  );
}