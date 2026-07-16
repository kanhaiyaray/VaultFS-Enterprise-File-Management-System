import { Link } from "react-router-dom";
import { useBranding } from "../components/BrandingProvider";
import {
  Zap,
  Shield,
  ShieldCheck,
  Users,
  Cloud,
  FileText,
  BarChart3,
  Share2,
  Lock,
  KeyRound,
  Fingerprint,
  Webhook,
  ArrowRight,
  CheckCircle2,
  Terminal,
  UploadCloud,
  ScrollText,
  Clock,
} from "lucide-react";

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="card p-6 hover:border-brand/30 transition-all duration-300 group">
    <div className="w-11 h-11 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-brand/15 transition-all">
      <Icon className="text-brand-glow" size={20} />
    </div>
    <h3 className="font-display font-semibold text-white text-base mb-1.5">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
  </div>
);

const CategoryHeader = ({ eyebrow, title, description }) => (
  <div className="mb-8">
    <span className="text-brand-glow text-xs font-semibold tracking-widest uppercase">{eyebrow}</span>
    <h3 className="font-display font-bold text-2xl text-white mt-2">{title}</h3>
    {description && <p className="text-gray-400 text-sm mt-1 max-w-xl">{description}</p>}
  </div>
);

const SecurityBadge = ({ icon: Icon, label }) => (
  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-surface-3 bg-surface-1/60 text-xs text-gray-300 hover:border-brand/40 hover:text-white transition-colors">
    <Icon size={13} className="text-brand-glow" />
    {label}
  </div>
);

const StepCard = ({ number, icon: Icon, title, description }) => (
  <div>
    <div className="flex items-center gap-3 mb-3">
      <span className="font-display text-3xl font-bold text-brand/30">{number}</span>
      <div className="w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
        <Icon size={16} className="text-brand-glow" />
      </div>
    </div>
    <h4 className="font-display font-semibold text-white text-base mb-1.5">{title}</h4>
    <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
  </div>
);

const SecurityPoint = ({ icon: Icon, title, description }) => (
  <div className="flex gap-3">
    <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0 mt-0.5">
      <Icon size={15} className="text-brand-glow" />
    </div>
    <div>
      <h4 className="font-display font-semibold text-white text-sm mb-0.5">{title}</h4>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

const VaultPreview = () => (
  <div className="relative">
    <div className="absolute -inset-6 bg-brand/20 blur-3xl rounded-full vfs-pulse" />
    <div className="relative card p-5 max-w-sm mx-auto lg:mx-0 shadow-2xl">
      <div className="flex items-center gap-1.5 mb-4">
        <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
        <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
        <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
        <span className="ml-2 text-[11px] text-gray-500 font-mono">vault://secure-storage</span>
      </div>

      <div className="space-y-2 mb-4">
        {[
          { name: "Q3-financials.xlsx", size: "1.2 MB" },
          { name: "employee-contracts.zip", size: "8.4 MB" },
          { name: "infra-diagram.pdf", size: "640 KB" },
        ].map((file) => (
          <div
            key={file.name}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-2/60 border border-surface-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={14} className="text-gray-500 flex-shrink-0" />
              <span className="text-xs text-gray-300 truncate">{file.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-gray-600">{file.size}</span>
              <ShieldCheck size={13} className="text-brand-glow" />
            </div>
          </div>
        ))}
      </div>

      <div className="px-3 py-2.5 rounded-lg bg-surface-2/40 border border-surface-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-gray-400 font-mono">AES-256-GCM · client-side</span>
          <span className="text-[11px] text-brand-glow font-mono">100%</span>
        </div>
        <div className="h-1 rounded-full bg-surface-3 overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-brand/60 to-brand-glow rounded-full vfs-shimmer" />
        </div>
      </div>
    </div>

    <div className="hidden sm:flex absolute -right-2 -bottom-4 lg:-right-6 items-center gap-2 px-3 py-2 rounded-xl bg-surface-1 border border-surface-3 shadow-xl vfs-float">
      <div className="w-6 h-6 rounded-md bg-brand/15 border border-brand/30 flex items-center justify-center">
        <Fingerprint size={12} className="text-brand-glow" />
      </div>
      <span className="text-[11px] text-gray-300 font-mono">2FA verified</span>
    </div>
  </div>
);

export default function LandingPage() {
  const { branding } = useBranding();
  const appName = branding?.appName || "VaultFS";
  const tagline = branding?.tagline || "Secure File Management";

  return (
    <div className="min-h-screen bg-surface-0 grid-bg overflow-x-hidden">
      <style>{`
        @keyframes vfs-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes vfs-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 0.8; } }
        @keyframes vfs-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .vfs-float { animation: vfs-float 4s ease-in-out infinite; }
        .vfs-pulse { animation: vfs-pulse 5s ease-in-out infinite; }
        .vfs-shimmer { background-size: 200% 100%; animation: vfs-shimmer 2.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .vfs-float, .vfs-pulse, .vfs-shimmer { animation: none; }
        }
      `}</style>

      {/* Navigation */}
      <header className="border-b border-surface-3 bg-surface-1/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand/20 border border-brand/30 flex items-center justify-center">
              <Zap size={18} className="text-brand-glow" />
            </div>
            <span className="font-display font-bold text-white text-xl tracking-tight">{appName}</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#security" className="hover:text-white transition-colors">Security</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm px-4 py-2">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm px-5 py-2">Get Started</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-14 items-center">
        <div className="text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/10 border border-brand/20 text-brand-glow text-xs font-medium mb-6">
            <Shield size={14} /> {tagline}
          </div>
          <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl text-white leading-tight">
            Files encrypted <br className="hidden lg:block" />
            <span className="text-brand-glow">before they leave your browser</span>
          </h1>
          <p className="text-gray-400 text-lg mt-5 max-w-xl mx-auto lg:mx-0">
            {appName} gives your team a self-hosted vault with role-based access,
            two-factor login, and sharing controls built for how enterprises
            actually move files.
          </p>
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 mt-8">
            <Link
              to="/register"
              className="btn-primary text-base px-6 py-3 inline-flex items-center gap-2 group"
            >
              Start free trial
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link to="/login" className="btn-ghost text-base px-6 py-3">
              Log in
            </Link>
          </div>
          <p className="text-xs text-gray-600 mt-4">No credit card required · 5 GB free storage</p>
        </div>

        <VaultPreview />
      </section>

      {/* Trust bar */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <p className="text-center text-xs text-gray-600 uppercase tracking-widest mb-4">
          Built on production-grade security primitives
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <SecurityBadge icon={KeyRound} label="OAuth 2.0" />
          <SecurityBadge icon={Fingerprint} label="TOTP 2FA" />
          <SecurityBadge icon={Users} label="Role-based access" />
          <SecurityBadge icon={ScrollText} label="SHA-256 dedup" />
          <SecurityBadge icon={Webhook} label="HMAC-signed webhooks" />
          <SecurityBadge icon={Lock} label="AES-256 at rest" />
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16 border-t border-surface-3">
        <div className="text-center mb-14">
          <span className="text-brand-glow text-xs font-semibold tracking-widest uppercase">Features</span>
          <h2 className="font-display font-bold text-3xl text-white mt-2">
            Everything a security team asks for, out of the box
          </h2>
        </div>

        <div className="mb-12">
          <CategoryHeader
            eyebrow="Access control"
            title="Lock it down without slowing anyone down"
            description="Every file, link, and login is governed by roles and policy, not trust."
          />
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard icon={Lock} title="End-to-end encryption" description="Files are encrypted before upload. Only your team holds the keys." />
            <FeatureCard icon={Fingerprint} title="Two-factor authentication" description="TOTP-based 2FA and OAuth login, with suspicious-login detection on every session." />
            <FeatureCard icon={Users} title="Granular roles" description="Owner, admin, editor, and viewer permissions, scoped per folder or workspace." />
          </div>
        </div>

        <div className="mb-12">
          <CategoryHeader
            eyebrow="Collaboration"
            title="Share files the way you'd want them shared back"
            description="Links that expire, previews that load instantly, activity you can actually see."
          />
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard icon={Share2} title="Advanced sharing" description="Password-protected links with expiry, download limits, and view-only mode." />
            <FeatureCard icon={FileText} title="In-browser previews" description="View PDFs, images, videos, audio, Office docs, code, and markdown instantly." />
            <FeatureCard icon={BarChart3} title="Activity dashboards" description="Track uploads, downloads, and access in real time, exportable for review." />
          </div>
        </div>

        <div>
          <CategoryHeader
            eyebrow="Infrastructure"
            title="Run it on your terms"
            description="Self-hosted on your own disk, or plugged into the cloud storage you already pay for."
          />
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard icon={Cloud} title="Cloud or self-hosted" description="Store files on your own disk, or integrate with Supabase and S3-compatible storage." />
            <FeatureCard icon={ScrollText} title="Content deduplication" description="SHA-256 content hashing means duplicate files never take up storage twice." />
            <FeatureCard icon={Webhook} title="Signed webhooks" description="HMAC-SHA256 signed events for uploads, shares, and deletes, ready for your own integrations." />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-16 border-t border-surface-3">
        <div className="text-center mb-14">
          <span className="text-brand-glow text-xs font-semibold tracking-widest uppercase">How it works</span>
          <h2 className="font-display font-bold text-3xl text-white mt-2">From upload to audit trail</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <StepCard number="01" icon={UploadCloud} title="Upload" description="Drag files in from the browser, or push them through the API." />
          <StepCard number="02" icon={Lock} title="Encrypt" description="Files are encrypted client-side before they ever reach storage." />
          <StepCard number="03" icon={Share2} title="Share" description="Generate scoped links with expiry, passwords, and download limits." />
          <StepCard number="04" icon={Clock} title="Audit" description="Every access and change is logged and exportable for compliance." />
        </div>
      </section>

      {/* Security deep dive */}
      <section id="security" className="max-w-6xl mx-auto px-6 py-16 border-t border-surface-3">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <span className="text-brand-glow text-xs font-semibold tracking-widest uppercase">Security model</span>
            <h2 className="font-display font-bold text-3xl text-white mt-2 mb-6">
              Built the way a security review would want it built
            </h2>
            <div className="space-y-5">
              <SecurityPoint icon={KeyRound} title="OAuth 2.0 sign-in" description="Federated login without your team juggling another password." />
              <SecurityPoint icon={Fingerprint} title="TOTP two-factor" description="A time-based code on every sensitive session, plus alerts on suspicious logins." />
              <SecurityPoint icon={Users} title="Role-based access control" description="Permissions scoped to workspace, folder, and action, not all-or-nothing." />
              <SecurityPoint icon={Webhook} title="HMAC-signed webhooks" description="Every outbound event is signed with SHA-256, so your integrations can verify it's really us." />
            </div>
          </div>

          <div className="card p-5 font-mono text-xs bg-surface-2/60 overflow-x-auto">
            <div className="flex items-center gap-2 mb-4 text-gray-500">
              <Terminal size={13} />
              <span>webhook.event.received</span>
            </div>
            <pre className="text-gray-400 leading-relaxed whitespace-pre-wrap">
              {`{
  "event": "file.shared",
  "resource_id": "f_8a12cd",
  "actor_role": "editor",
  "timestamp": "2026-07-16T09:41:03Z",
  "signature": "sha256=4f2a...c91e",
  "verified": `}<span className="text-brand-glow">true</span>{`
}`}
            </pre>
            <div className="flex items-center gap-1.5 mt-4 text-brand-glow">
              <CheckCircle2 size={13} />
              <span>Signature verified against webhook secret</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <div className="card p-10 bg-gradient-to-br from-surface-2 to-surface-1 border-brand/20">
          <h2 className="font-display font-bold text-3xl text-white">
            Ready to take control of your files?
          </h2>
          <p className="text-gray-400 mt-3 max-w-lg mx-auto">
            Set up your workspace in minutes, and invite your team once your
            vault is ready.
          </p>
          <Link
            to="/register"
            className="btn-primary text-base px-8 py-3 mt-6 inline-flex items-center gap-2"
          >
            Get Started — It's Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-3 bg-surface-1 py-8 mt-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-brand-glow" />
            <span className="font-display font-bold text-white">{appName}</span>
          </div>
          <p className="text-xs text-gray-600">
            © {appName}. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <Link to="/login" className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/register" className="hover:text-white transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}