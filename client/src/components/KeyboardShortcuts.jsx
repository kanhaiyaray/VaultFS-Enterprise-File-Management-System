import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";

const shortcuts = [
  {
    category: "Navigation",
    items: [
      { key: "D",   desc: "Go to Dashboard"    },
      { key: "U",   desc: "Go to Upload"        },
      { key: "S",   desc: "Go to Starred Files" },
      { key: "A",   desc: "Go to Analytics"     },
      { key: "T",   desc: "Go to Trash"         },
    ],
  },
  {
    category: "Actions",
    items: [
      { key: "Esc",   desc: "Close modals / sidebar"             },
      { key: "?",     desc: "Show keyboard shortcuts"             },
      { key: "Del",   desc: "Delete selected files (select mode)" },
      { key: "Ctrl+Z", desc: "Undo last file action"              },
      { key: "Ctrl+Y", desc: "Redo last undone action"            },
    ],
  },
  {
    category: "File List",
    items: [
      { key: "Ctrl+A", desc: "Select all files"      },
      { key: "Ctrl+D", desc: "Deselect all files"    },
      { key: "Space",  desc: "Preview selected file" },
      { key: "F",      desc: "Focus quick search"    },
      { key: "G / L",  desc: "Switch grid or list"   },
    ],
  },
];

export default function KeyboardShortcuts({ onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-1 border border-surface-4 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-brand-glow" />
            <h2 className="font-display font-bold text-white text-lg">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {section.category}
              </p>
              <div className="space-y-1.5">
                {section.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4">
                    <span className="text-sm text-gray-300">{item.desc}</span>
                    <kbd className="bg-surface-3 border border-surface-4 px-2 py-1 rounded text-xs text-gray-300 font-mono flex-shrink-0">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-600 mt-5 text-center">
          Shortcuts are disabled when typing in input fields
        </p>
      </div>
    </div>
  );
}
