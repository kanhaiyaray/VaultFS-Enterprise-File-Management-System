import { Loader2, ArrowUp, ArrowDown, Minus } from "lucide-react";

export function Card({ title, subtitle, action, children, className = "", bodyClass = "" }) {
  return (
    <div className={"card overflow-hidden " + className}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-surface-3">
          <div className="min-w-0">
            {title && <h3 className="font-display font-semibold text-white text-sm truncate">{title}</h3>}
            {subtitle && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={"p-4 " + bodyClass}>{children}</div>
    </div>
  );
}

export function Trend({ value }) {
  if (value === undefined || value === null) return null;
  const isUp = value > 0;
  const isFlat = value === 0;
  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown;
  const cls = isFlat
    ? "text-gray-500 bg-surface-3 border-surface-4"
    : isUp
      ? "text-emerald-400 bg-emerald-900/20 border-emerald-900/30"
      : "text-accent-red bg-red-900/20 border-red-900/30";
  return (
    <span className={"inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border " + cls}>
      <Icon size={9} />
      {Math.abs(value)}%
    </span>
  );
}

export function Badge({ children, variant = "default" }) {
  const styles = {
    default: "bg-surface-3 text-gray-400 border-surface-4",
    brand:   "bg-brand/15 text-brand-glow border-brand/25",
    success: "bg-emerald-900/20 text-emerald-400 border-emerald-900/30",
    warning: "bg-amber-900/20 text-amber-400 border-amber-900/30",
    danger:  "bg-red-900/20 text-accent-red border-red-900/30",
  };
  return (
    <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border " + styles[variant]}>
      {children}
    </span>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="py-10 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-surface-3 border border-surface-4 flex items-center justify-center mx-auto mb-3">
          <Icon size={22} className="text-gray-600" />
        </div>
      )}
      <p className="text-sm text-gray-400 font-medium">{title}</p>
      {description && <p className="text-xs text-gray-600 mt-1 max-w-xs mx-auto">{description}</p>}
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 skeleton rounded-lg" />
          <div className="h-3 w-72 skeleton rounded" />
        </div>
        <div className="h-9 w-32 skeleton rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="card h-28 skeleton" />)}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 card h-72 skeleton" />
            <div className="lg:col-span-2 card h-72 skeleton" />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="card h-64 skeleton" />
            <div className="card h-64 skeleton" />
          </div>
        </div>
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-48 skeleton" />)}
        </div>
      </div>
    </div>
  );
}

export function FullSpinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Loader2 size={26} className="animate-spin text-brand-glow" />
    </div>
  );
}
