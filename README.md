<div align="center">

# 🔐 VaultFS
### Enterprise-Grade Self-Hosted File Management System

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-6%2B-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Express](https://img.shields.io/badge/Express-4-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge)](./LICENSE)

<br/>

**Secure, real-time file collaboration for teams and organizations.**

Self-hosted · SHA-256 deduplication · Role-based access · 2FA · Webhooks · Admin dashboard

[![Live Demo](https://img.shields.io/badge/-%F0%9F%8C%90%20%20OPEN%20LIVE%20APP%20%E2%86%97-0f0f0f?style=for-the-badge&logoColor=white&labelColor=0f0f0f)](https://vaultfs-enterprise-file-management-system-production.up.railway.app/)
&nbsp;&nbsp;&nbsp;
[![GitHub](https://img.shields.io/badge/-%E2%AD%90%20%20VIEW%20ON%20GITHUB-1a1a2e?style=for-the-badge&logo=github&logoColor=white&labelColor=1a1a2e)](https://github.com/kanhaiyaray/VaultFS-Enterprise-File-Management-System)

---
[🚀 Quick Start](#-quick-start) · [✨ Features](#-features) · [🗂️ Project Structure](#️-project-structure) · [📡 API Reference](#-api-reference) · [⚙️ Environment Variables](#️-environment-variables) · [🔒 Security](#-security-implementation) · [🔄 Data Flows](#-key-data-flows) · [🗄️ Database Models](#️-database-models)

</div>

---

## 📦 What is VaultFS?

VaultFS is a **full-featured, self-hosted file management platform** built for teams and enterprises. Unlike cloud-only solutions, VaultFS gives you complete control over your data:

- Files stored on **your own disk** inside `server/uploads/`
- Metadata in **your own MongoDB** instance
- Authentication, sharing, and workflows entirely under **your own governance**

It ships with a modern dark-themed UI, real-time updates via Socket.IO, advanced sharing controls, file versioning, full-text search, an in-browser preview engine for 9+ file types, and a comprehensive admin dashboard — all out of the box, zero vendor lock-in.

---

## 🧱 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + Vite 8 + Tailwind CSS 3 + React Router 6 | UI, routing, styling |
| **Real-time** | Socket.IO Client / Server 4 | Live activity feeds, notifications |
| **Backend** | Node.js 20+ + Express 4 | REST API, business logic |
| **Database** | MongoDB 6+ with Mongoose ODM | Persistent data storage |
| **Auth** | JWT (localStorage) + Passport.js + TOTP (speakeasy) + bcrypt | Session management, OAuth, 2FA |
| **File Processing** | Sharp (thumbnails + compression) + Multer (uploads) + archiver + unzipper | Upload pipeline |
| **Email** | Nodemailer (SMTP — Gmail, SendGrid, Mailgun, etc.) | Transactional email |
| **Preview Engines** | Marked.js + Prism.js + Mammoth.js + SheetJS + JSZip + epub.js | In-browser file previews |
| **Security** | Helmet.js + express-rate-limit + Morgan + FingerprintJS + HMAC-SHA256 | Hardened HTTP layer |
| **AI (optional)** | OpenAI API | Folder suggestions, duplicate detection, image descriptions |

---

## ✨ Features

### 🔐 Authentication & Security

- **JWT sessions** — 7-day expiry, stored in localStorage, XSS mitigated via CSP headers
- **OAuth 2.0** — Google and GitHub sign-in via Passport.js with automatic account linking
- **TOTP Two-Factor Authentication** — speakeasy-based with QR code setup flow
- **Device fingerprinting** — FingerprintJS tracks devices; suspicious logins trigger email security alerts
- **Password reset & email verification** — full token-based flows via Nodemailer
- **Rate limiting** — 10 uploads/min · 200 API requests/15 min per endpoint group via express-rate-limit
- **Permanent & time-based user bans** — managed directly from the admin panel
- **GDPR compliance** — account data export and self-deletion flows built-in

### 📁 File Management

- **Drag-and-drop upload** with real-time progress indicators via React Dropzone
- **Import from URL** — pull files directly from any public URL into your vault
- **File versioning** — full version history stored in `File.versions[]` with one-click restore
- **SHA-256 deduplication** — identical files share a single disk object; only metadata differs per user
- **Bulk operations** — select multiple files for delete, ZIP download, or batch tag editing
- **30-day soft-delete trash** with permanent deletion and restore options
- **Starred files** and custom color labels per user
- **Smart Folders** — rule-based virtual collections evaluated client-side by MIME type, tags, date, size, or starred status

### 🖼️ In-Browser Preview Engine

| File Type | Technology | Notes |
|---|---|---|
| Images (JPG, PNG, WEBP) | Sharp server-side thumbnails | EXIF stripped for privacy |
| Video / Audio | HTML5 `<video>` / `<audio>` player | Native browser playback |
| PDF | Embedded `<iframe>` viewer | No plugin required |
| DOCX | Mammoth.js → HTML (client-side) | Preserves basic formatting |
| XLSX / CSV | SheetJS → interactive table (client-side) | Sortable columns |
| PPTX | JSZip → extracted slide text | Text-only extraction |
| Code (30+ languages) | Prism.js syntax highlighting (client-side) | Theme-matched highlighting |
| Markdown | Marked.js with split-pane live editor | Real-time preview |
| EPUB | epub.js (client-side) | Full reader experience |

### 🔗 Sharing & Collaboration

- **Advanced share links** — password protection, expiry dates, download limits, view-only mode — all configurable per link
- **Public gallery** of shared files browsable without an account
- **Team workspaces** with role-based access: `owner` · `admin` · `editor` · `viewer`
- **File Requests** — public upload slugs that accept submissions from unauthenticated users (email capture, size limits, submission caps)
- **Real-time activity feed** — Socket.IO broadcasts every file event to all connected clients instantly
- **Webhooks** — HMAC-SHA256 signed payloads with per-event filtering, up to 10 endpoints per user

### 🔍 Organization & Search

- **Full-text search** with boolean operators (`AND` / `OR` / `NOT`) and saved search queries
- **Smart Folders** — client-side virtual collections built from customizable rules
- **File diff viewer** — side-by-side comparison of text files or any two file versions
- **Tags & descriptions** — manually applied, or AI-assisted via optional OpenAI integration

---

## 🛠️ Admin Dashboard

| Section | Capabilities |
|---|---|
| **Users** | List, search, filter, create, edit, ban/unban, force password reset, impersonate any user, CSV export |
| **Files** | Browse all files across all users, full-text search, delete, identify storage hogs, clean orphaned files |
| **Stats** | Storage analytics, upload trend charts, MIME type breakdown, top uploaders leaderboard |
| **Activity Log** | Full audit trail — filter by action, user, date range, and IP address |
| **Announcements** | Broadcast in-app + email messages to all users or specific roles |
| **Branding** | Custom app name, logo, favicon, primary/accent colors, maintenance mode, feature toggles |
| **Workflows** | Visual drag-and-drop builder for automated actions triggered by time, file events, or webhooks |

---

## 🗂️ Project Structure

```
VaultFS/
│
├── client/                          # React 18 + Vite 8 frontend
│   ├── public/                      # Static assets (favicon, logos)
│   ├── index.html                   # Vite HTML entry point
│   ├── vite.config.js               # Vite build config + API proxy
│   ├── package.json                 # Frontend dependencies
│   └── src/
│       ├── components/              # 40+ reusable UI components
│       │   ├── FileCard.jsx         # File list/grid item with preview thumb
│       │   ├── UploadZone.jsx       # React Dropzone wrapper + progress UI
│       │   ├── ShareModal.jsx       # Share link config (password, expiry, limits)
│       │   ├── PreviewEngine.jsx    # Unified file preview dispatcher
│       │   ├── WorkflowBuilder.jsx  # Drag-and-drop workflow visual editor
│       │   ├── AdminTable.jsx       # Sortable, filterable admin data table
│       │   └── ...                  # 34 more components
│       │
│       ├── pages/                   # 14 route-level page components
│       │   ├── Dashboard.jsx        # Main file browser + activity feed
│       │   ├── Upload.jsx           # Upload page with queue management
│       │   ├── Shared.jsx           # Public share link viewer
│       │   ├── Admin.jsx            # Admin dashboard shell
│       │   ├── Profile.jsx          # User settings + 2FA setup
│       │   ├── Team.jsx             # Team workspace management
│       │   ├── FileRequest.jsx      # Public file request submission page
│       │   ├── Search.jsx           # Full-text search with boolean filters
│       │   ├── Trash.jsx            # Soft-deleted files + restore
│       │   ├── PublicGallery.jsx    # Unauthenticated shared files browse
│       │   ├── Login.jsx            # Login with fingerprint collection
│       │   ├── Register.jsx         # Account creation
│       │   ├── TwoFactor.jsx        # TOTP challenge page
│       │   └── Settings.jsx         # App preferences + notification prefs
│       │
│       ├── context/                 # React Context providers
│       │   ├── AuthContext.jsx      # JWT state, login/logout, user object
│       │   ├── ThemeContext.jsx     # Dark/light mode toggle + persistence
│       │   ├── ActionHistoryContext.jsx  # Undo/redo for file operations
│       │   └── BrandingContext.jsx  # Custom branding config from /api/branding
│       │
│       ├── hooks/                   # Custom React hooks
│       │   ├── useSocket.js         # Socket.IO connection lifecycle
│       │   ├── useLocalStorage.js   # Persistent state with JSON serialization
│       │   └── useFileOrganizer.js  # Smart folder rule evaluation engine
│       │
│       ├── utils/                   # Shared client utilities
│       │   ├── axios.js             # Axios instance with JWT interceptors
│       │   ├── helpers.js           # formatBytes, formatDate, getMimeIcon, etc.
│       │   ├── encryption.js        # AES-256-CBC encrypt/decrypt via crypto-js
│       │   └── fingerprint.js       # FingerprintJS device ID collection
│       │
│       └── styles/                  # Tailwind CSS config + custom animations
│           ├── tailwind.config.js   # Custom colors, fonts, breakpoints
│           └── animations.css       # Keyframe animations + transition utilities
│
├── server/                          # Node.js / Express 4 API
│   ├── index.js                     # Main entry point — Express app + Socket.IO init
│   ├── package.json                 # Backend dependencies
│   │
│   ├── controllers/                 # Route handler logic (13 controllers)
│   │   ├── authController.js        # Register, login, 2FA, OAuth, password reset
│   │   ├── fileController.js        # Upload, download, versioning, search, trash
│   │   ├── adminController.js       # User/file/stats management
│   │   ├── webhookController.js     # Webhook CRUD + delivery
│   │   ├── workflowController.js    # Visual workflow builder + execution
│   │   ├── aiController.js          # OpenAI integrations
│   │   ├── announcementController.js # Broadcast message management
│   │   ├── brandingController.js    # UI customization settings
│   │   ├── fileRequestController.js # Public upload slug management
│   │   ├── teamController.js        # Team workspace management
│   │   ├── userController.js        # User profile + prefs
│   │   ├── searchController.js      # Full-text search + saved queries
│   │   └── shareController.js       # Share link access control
│   │
│   ├── models/                      # Mongoose ODM schemas (10 models)
│   │   ├── User.js                  # username, email, bcrypt password, 2FA, OAuth, quotas, bans
│   │   ├── File.js                  # versions[], shareToken, hash, tags, labels, accessLogs
│   │   ├── FileRequest.js           # slug, submissions[], expiry, email capture
│   │   ├── Webhook.js               # url, HMAC secret, events[], delivery stats
│   │   ├── Branding.js              # appName, colors, logos, maintenance mode, feature flags
│   │   ├── Announcement.js          # subject, message, targetRole, isActive
│   │   ├── Activity.js              # Full audit log — action, user, ip, userAgent
│   │   ├── Device.js                # fingerprint, isTrusted, isSuspicious, suspicionReason
│   │   ├── Team.js                  # name, owner, inviteCode, members[{userId, role}]
│   │   └── Workflow.js              # trigger, condition, actions, approval, runHistory
│   │
│   ├── routes/                      # Express route modules (11 files)
│   │   ├── auth.js                  # /api/auth/*
│   │   ├── files.js                 # /api/files/*
│   │   ├── files_additions.js       # Extended file routes (diff, smart folders, labels)
│   │   ├── admin.js                 # /api/admin/*
│   │   ├── ai.js                    # /api/ai/* (OpenAI integration)
│   │   ├── announcements.js         # /api/announcements/*
│   │   ├── branding.js              # /api/branding/*
│   │   ├── fileRequests.js          # /api/file-requests/*
│   │   ├── team.js                  # /api/team/*
│   │   ├── users.js                 # /api/users/me/*
│   │   ├── webhooks.js              # /api/webhooks/*
│   │   └── workflows.js             # /api/workflows/*
│   │
│   ├── middleware/                  # Express middleware
│   │   ├── auth.js                  # JWT verification + role guard
│   │   ├── upload.js                # Multer config (disk storage, file filter, size limit)
│   │   └── rateLimiter.js           # Per-endpoint rate limiting via express-rate-limit
│   │
│   ├── utils/                       # Shared server utilities
│   │   ├── activityLogger.js        # Writes to Activity model on every action
│   │   ├── email.js                 # Email template builder (HTML + plain text)
│   │   ├── sendMail.js              # Nodemailer SMTP transport wrapper
│   │   ├── passport.js              # Google + GitHub OAuth strategy config
│   │   ├── socket.js                # Socket.IO event emitters (activity, notifications)
│   │   └── workflowEngine.js        # Trigger evaluation + action execution engine
│   │
│   ├── scripts/                     # Maintenance / migration scripts
│   │   ├── cleanOrphans.js          # Remove files on disk with no DB record
│   │   ├── migrateHashes.js         # Backfill SHA-256 hashes on legacy files
│   │   └── exportUsers.js           # CSV export of all user accounts
│   │
│   └── uploads/                     # ⚠️ User file storage — must be a persistent volume
│       └── {userId}/                # Files namespaced per user
│           ├── {timestamp}-{hash}.{ext}        # Original uploaded file
│           └── thumb_{timestamp}-{hash}.{ext}  # Sharp-generated thumbnail (images only)
│
├── package.json                     # Root workspace — runs client + server concurrently
└── README.md                        # This file
```

> **Note:** `node_modules/` is gitignored. `server/uploads/` is gitignored — back it with a persistent volume in production.

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | **20+** | Do NOT use v18 or lower — required by Sharp |
| MongoDB | **6+** | Local instance or MongoDB Atlas |
| npm | **9+** | Comes bundled with Node.js 20 |
| SMTP server | Any | Gmail, SendGrid, Mailgun — required for email flows |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/kanhaiyaray/VaultFS-Enterprise-File-Management-System.git
cd VaultFS-Enterprise-File-Management-System

# 2. Install all dependencies (root workspace + client/ + server/)
npm run install:all

# 3. Configure environment variables
cp server/.env.example server/.env
# Open server/.env and fill in your values (see Environment Variables below)

# 4. Start both servers in development mode
npm run dev
# → API server:    http://localhost:5000
# → React client:  http://localhost:5173
```

### Production Deployment

```bash
# 1. Build the React frontend (outputs to client/dist/)
npm run build

# 2. Start Express in production mode
#    Express will serve client/dist/ statically
NODE_ENV=production node server/index.js
```

> **Always run behind a reverse proxy** (nginx, Caddy) with SSL termination.
> Never expose the Express server directly to the internet.

---

## ⚙️ Environment Variables

### `server/.env`

```env
# ── Server ────────────────────────────────────────────
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173          # Used for CORS + email links

# ── Database ──────────────────────────────────────────
MONGO_URI=mongodb://127.0.0.1:27017/vaultfs

# ── JWT ───────────────────────────────────────────────
JWT_SECRET=change-this-to-a-long-random-string   # ⚠️ Never commit — use openssl rand -hex 64
JWT_EXPIRES_IN=7d

# ── SMTP (required for all email flows) ───────────────
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false                       # true = SSL (port 465), false = STARTTLS (port 587)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=xxxx xxxx xxxx xxxx           # Use an App Password for Gmail
EMAIL_FROM="VaultFS" <noreply@vaultfs.com>

# ── File Storage Limits ───────────────────────────────
MAX_FILE_SIZE=52428800                   # 50 MB per file (bytes)
DEFAULT_STORAGE_LIMIT=5368709120         # 5 GB per user (bytes)

# ── OAuth — Google (optional) ─────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://vault.yourdomain.com/api/auth/google/callback

# ── OAuth — GitHub (optional) ─────────────────────────
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=https://vault.yourdomain.com/api/auth/github/callback

# ── AI Features (optional) ────────────────────────────
OPENAI_API_KEY=sk-...                    # Enables /api/ai/* endpoints

# ── AWS S3 (optional — workflow backup action) ────────
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=
```

### `client/.env`

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

> In production, both should point to your backend domain (e.g. `https://vaultfs-enterprise-file-management-system-production.up.railway.app`).

---

## 📡 API Reference

### Public Endpoints (no authentication required)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/branding` | Retrieve public branding configuration |
| `GET` | `/api/files/share/:token` | Get share link metadata |
| `POST` | `/api/files/share/:token/access` | Unlock a password-protected share link |
| `GET` | `/api/file-requests/:slug` | Get public file request info |
| `POST` | `/api/file-requests/:slug/submit` | Submit files to a public request |

### Auth Endpoints (`/api/auth/*`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | ❌ | Register new user account |
| `POST` | `/api/auth/login` | ❌ | Login with device fingerprint check |
| `POST` | `/api/auth/logout` | ✅ JWT | Invalidate session |
| `POST` | `/api/auth/2fa/setup` | ✅ JWT | Generate TOTP secret + QR code |
| `POST` | `/api/auth/2fa/verify` | ✅ JWT | Verify TOTP token, enable 2FA |
| `POST` | `/api/auth/2fa/disable` | ✅ JWT | Disable 2FA (requires current TOTP) |
| `POST` | `/api/auth/forgot-password` | ❌ | Send password reset email |
| `POST` | `/api/auth/reset-password` | ❌ | Reset password with token |
| `GET` | `/api/auth/verify-email/:token` | ❌ | Verify email address |
| `GET` | `/api/auth/google` | ❌ | Initiate Google OAuth2 flow |
| `GET` | `/api/auth/google/callback` | ❌ | Google OAuth2 callback |
| `GET` | `/api/auth/github` | ❌ | Initiate GitHub OAuth2 flow |
| `GET` | `/api/auth/github/callback` | ❌ | GitHub OAuth2 callback |

### File Endpoints (`/api/files/*`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/files/upload` | ✅ JWT | Upload file (multipart/form-data) |
| `GET` | `/api/files` | ✅ JWT | List files with filters, pagination, sorting |
| `GET` | `/api/files/search` | ✅ JWT | Boolean full-text search (AND/OR/NOT) |
| `GET` | `/api/files/trash` | ✅ JWT | List soft-deleted files |
| `GET` | `/api/files/starred` | ✅ JWT | List starred files |
| `GET` | `/api/files/:id` | ✅ JWT | Get single file metadata |
| `GET` | `/api/files/download/:id` | ✅ JWT/Access | Stream file download |
| `PUT` | `/api/files/:id` | ✅ JWT | Update name, tags, description, labels |
| `DELETE` | `/api/files/:id` | ✅ JWT | Soft-delete to trash |
| `DELETE` | `/api/files/:id/permanent` | ✅ JWT | Permanently delete file |
| `POST` | `/api/files/:id/restore` | ✅ JWT | Restore from trash |
| `POST` | `/api/files/:id/star` | ✅ JWT | Toggle starred status |
| `GET` | `/api/files/:id/versions` | ✅ JWT | List file version history |
| `POST` | `/api/files/:id/versions/:versionId/restore` | ✅ JWT | Restore specific version |
| `POST` | `/api/files/:id/share` | ✅ JWT | Create/update share link |
| `DELETE` | `/api/files/:id/share` | ✅ JWT | Revoke share link |
| `POST` | `/api/files/import-url` | ✅ JWT | Import file from public URL |
| `POST` | `/api/files/bulk` | ✅ JWT | Bulk delete / ZIP download |
| `GET` | `/api/files/:id/diff` | ✅ JWT | Side-by-side text diff |
| `POST` | `/api/files/smart-folder/evaluate` | ✅ JWT | Evaluate smart folder rules |
| `PUT` | `/api/files/:id/label` | ✅ JWT | Assign color label |

### Webhook Endpoints (`/api/webhooks/*`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/webhooks` | ✅ JWT | List all webhook endpoints |
| `POST` | `/api/webhooks` | ✅ JWT | Create webhook endpoint |
| `GET` | `/api/webhooks/:id` | ✅ JWT | Get webhook details |
| `PUT` | `/api/webhooks/:id` | ✅ JWT | Update webhook config |
| `DELETE` | `/api/webhooks/:id` | ✅ JWT | Delete webhook endpoint |
| `POST` | `/api/webhooks/:id/test` | ✅ JWT | Send test delivery |
| `GET` | `/api/webhooks/:id/logs` | ✅ JWT | View delivery log history |

### Team Endpoints (`/api/team/*`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/team` | ✅ JWT | Create new team |
| `GET` | `/api/team/:id` | ✅ JWT | Get team details + members |
| `POST` | `/api/team/:id/invite` | ✅ Admin | Generate invite link |
| `POST` | `/api/team/join/:code` | ✅ JWT | Join team via invite code |
| `PATCH` | `/api/team/:id/members/:userId` | ✅ Admin | Update member role |
| `DELETE` | `/api/team/:id/members/:userId` | ✅ Admin | Remove team member |
| `DELETE` | `/api/team/:id` | ✅ Owner | Delete team |

### Admin Endpoints (`/api/admin/*`)

> All admin endpoints require `role: "admin"` on the JWT user claim.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/admin/users` | List all users (search, filter, sort, paginate) |
| `GET` | `/api/admin/users/:id` | Get full user profile |
| `POST` | `/api/admin/users` | Create user account manually |
| `PUT` | `/api/admin/users/:id` | Edit user account details |
| `PATCH` | `/api/admin/users/:id/ban` | Ban/unban user (permanent or timed) |
| `POST` | `/api/admin/users/:id/force-reset` | Force password reset email |
| `POST` | `/api/admin/users/:id/impersonate` | Generate impersonation JWT |
| `GET` | `/api/admin/users/export` | CSV export of all users |
| `GET` | `/api/admin/files` | Browse all files across all users |
| `DELETE` | `/api/admin/files/:id` | Admin-delete any file |
| `GET` | `/api/admin/files/orphans` | Find files on disk with no DB record |
| `DELETE` | `/api/admin/files/orphans` | Clean all orphaned disk files |
| `GET` | `/api/admin/files/duplicates` | Find files sharing same SHA-256 hash |
| `GET` | `/api/admin/stats` | System metrics, upload trends, MIME breakdown |
| `GET` | `/api/admin/activity` | Full audit log (filter by user, action, IP, date) |
| `POST` | `/api/admin/announcements` | Broadcast announcement |
| `GET` | `/api/admin/announcements` | List all announcements |
| `DELETE` | `/api/admin/announcements/:id` | Remove announcement |
| `GET` | `/api/admin/branding` | Get full branding config |
| `PUT` | `/api/admin/branding` | Update branding, feature flags, limits |
| `GET` | `/api/admin/workflows` | List all workflows |
| `POST` | `/api/admin/workflows/:id/approve` | Approve pending workflow step |
| `POST` | `/api/admin/workflows/:id/reject` | Reject pending workflow step |

---

## 🗄️ Database Models

### `User`

```js
{
  username:           String,   // unique, indexed
  email:              String,   // unique, indexed
  password:           String,   // bcrypt hash, 12 rounds
  role:               String,   // "user" | "admin"
  isEmailVerified:    Boolean,
  emailVerifyToken:   String,
  passwordResetToken: String,
  passwordResetExpiry:Date,
  twoFactorSecret:    String,   // speakeasy TOTP secret
  isTwoFactorEnabled: Boolean,
  googleId:           String,
  githubId:           String,
  storageUsed:        Number,   // bytes
  storageLimit:       Number,   // bytes (default: 5GB)
  isBanned:           Boolean,
  banExpiresAt:       Date,     // null = permanent
  banReason:          String,
  notificationPrefs:  {
    onShare:    Boolean,
    onDownload: Boolean,
    onTeamInvite: Boolean,
    announcements: Boolean
  },
  customLabels: [{
    name:  String,
    color: String    // hex color
  }],
  createdAt:  Date,
  updatedAt:  Date
}
```

### `File`

```js
{
  userId:             ObjectId,  // ref: User, indexed
  filename:           String,    // original display name
  storedName:         String,    // timestamp-hash.ext on disk
  path:               String,    // full disk path
  thumbnailPath:      String,    // sharp-generated thumb path
  size:               Number,    // bytes
  mimeType:           String,    // indexed
  hash:               String,    // SHA-256, indexed (dedup key)
  versions: [{
    storedName: String,
    path:       String,
    size:       Number,
    createdAt:  Date
  }],
  shareToken:         String,    // indexed
  sharePassword:      String,    // bcrypt hash
  shareExpiresAt:     Date,
  shareMaxDownloads:  Number,
  shareViewOnly:      Boolean,
  downloadCount:      Number,
  isDeleted:          Boolean,   // indexed (soft delete)
  deletedAt:          Date,      // 30-day TTL
  tags:               [String],
  labels:             [String],
  isStarred:          Boolean,
  description:        String,
  aiDescription:      String,    // OpenAI-generated
  encryptionIV:       String,    // client-side AES-CBC IV
  accessLogs: [{
    ip:        String,
    userAgent: String,
    at:        Date
  }],
  createdAt:  Date,
  updatedAt:  Date
}
```

### `FileRequest`

```js
{
  userId:         ObjectId,  // owner ref
  title:          String,
  description:    String,
  slug:           String,    // unique URL slug
  maxSubmissions: Number,
  expiresAt:      Date,
  requireEmail:   Boolean,
  allowedTypes:   [String],  // MIME type allowlist
  maxFileSize:    Number,    // bytes per submission
  submissions: [{
    filename:    String,
    path:        String,
    size:        Number,
    email:       String,
    submittedAt: Date
  }],
  createdAt: Date
}
```

### `Webhook`

```js
{
  userId:       ObjectId,   // owner ref
  name:         String,     // display name
  url:          String,     // delivery endpoint
  secret:       String,     // HMAC-SHA256 signing key
  events:       [String],   // ["file.uploaded", "file.downloaded", ...]
  isActive:     Boolean,
  totalFired:   Number,
  failureCount: Number,
  lastFiredAt:  Date,
  createdAt:    Date
}
```

### `Branding`

```js
{
  appName:         String,
  primaryColor:    String,    // hex
  accentColor:     String,    // hex
  logoUrl:         String,
  faviconUrl:      String,
  maintenanceMode: Boolean,
  maintenanceMsg:  String,
  features: {
    registration:  Boolean,
    oauthGoogle:   Boolean,
    oauthGithub:   Boolean,
    fileRequests:  Boolean,
    publicGallery: Boolean,
    aiFeatures:    Boolean
  },
  limits: {
    maxFileSize:     Number,
    defaultQuota:    Number,
    maxWebhooks:     Number
  }
}
```

### `Activity`

```js
{
  user:      ObjectId,  // ref: User, indexed
  action:    String,    // "file.uploaded" | "user.login" | "share.created" | ..., indexed
  details:   Mixed,     // context-specific payload
  ip:        String,    // indexed
  userAgent: String,
  createdAt: Date       // indexed
}
```

### `Device`

```js
{
  fingerprint:    String,    // FingerprintJS hash, indexed
  userId:         ObjectId,  // ref: User, indexed
  isTrusted:      Boolean,
  isSuspicious:   Boolean,
  suspicionReason:String,
  userAgent:      String,
  platform:       String,
  timezone:       String,
  lastSeenAt:     Date,
  createdAt:      Date
}
```

### `Team`

```js
{
  name:       String,
  owner:      ObjectId,  // ref: User, indexed
  inviteCode: String,    // unique short code
  members: [{
    userId: ObjectId,    // ref: User
    role:   String       // "owner" | "admin" | "editor" | "viewer"
  }],
  createdAt: Date
}
```

### `Workflow`

```js
{
  userId: ObjectId,    // ref: User
  name:   String,
  trigger: String,     // "file.uploaded" | "schedule" | "webhook"
  condition: {
    field:    String,
    operator: String,
    value:    Mixed
  },
  actions: [{
    type:   String,    // "move" | "tag" | "notify" | "archive" | "s3backup"
    config: Mixed
  }],
  approval: {
    required:    Boolean,
    approverIds: [ObjectId]
  },
  pendingApproval: [{
    fileId:      ObjectId,
    triggeredAt: Date
  }],
  runHistory: [{
    triggeredAt: Date,
    status:      String,  // "success" | "failed" | "pending_approval"
    output:      Mixed
  }],
  isActive:  Boolean,
  createdAt: Date
}
```

---

## 🔄 Key Data Flows

### Authentication (with Device Fingerprinting)

```
LoginPage
  → useAuth.login()
  → Collect device fingerprint via FingerprintJS
  → Collect deviceInfo: { userAgent, platform, timezone }
  → POST /api/auth/login  { email, password, fingerprint, deviceInfo }
        │
        ├─ authController: bcrypt.compare(password, user.password)
        │
        ├─ Look up Device by fingerprint
        │     ├─ Unknown + suspicious patterns
        │     │     → send security alert email via Nodemailer
        │     │     → return { requiresVerification: true }
        │     │
        │     ├─ 2FA enabled
        │     │     → return { requires2FA: true }
        │     │     → client redirects to /2fa
        │     │     → POST /api/auth/2fa/verify  { token }
        │     │     → speakeasy.totp.verify()
        │     │
        │     └─ Clean / trusted device
        │           → jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" })
        │           → return { token, user }
        │
  → Client: localStorage.setItem("token", jwt)
  → Axios interceptor attaches: Authorization: Bearer <token>
  → Redirect to /dashboard
```

### File Upload Pipeline

```
UploadPage → React Dropzone → handleUpload()
  → XHR with progress events → POST /api/files/upload (multipart/form-data)
        │
        ├─ rateLimiter: 10 uploads/min per IP
        ├─ auth middleware: verify JWT
        ├─ upload middleware (Multer):
        │     → validate MIME type against allowlist
        │     → enforce MAX_FILE_SIZE
        │     → save to server/uploads/{userId}/{timestamp}-{random}.{ext}
        │
        ├─ Sharp (images only):
        │     → compress + strip EXIF metadata
        │     → generate 300px thumbnail
        │     → save thumb_{filename} alongside original
        │
        ├─ SHA-256 deduplication:
        │     → crypto.createHash("sha256").update(fileBuffer).digest("hex")
        │     → query: File.findOne({ hash, userId })
        │           ├─ Duplicate found
        │           │     → create new File doc pointing to existing disk path
        │           │     → delete newly uploaded file (fs.unlink)
        │           └─ New file
        │                 → keep file on disk, record new path
        │
        ├─ File.create({ userId, filename, path, size, mimeType, hash, ... })
        ├─ User.findByIdAndUpdate({ $inc: { storageUsed: size } })
        ├─ activityLogger.log({ action: "file.uploaded", user, ip })
        ├─ socket.emit("activity", payload)  → broadcast to all clients
        ├─ webhookController.triggerEvent("file.uploaded", payload)
        └─ workflowEngine.evaluate("file.uploaded", file)
```

### File Download & Share Access

```
Anyone visits share URL
  → GET /api/files/share/:token
  → Return: { name, size, mimeType, hasPassword, expiresAt, downloadsLeft }

If password-protected:
  → POST /api/files/share/:token/access  { password }
  → bcrypt.compare(password, file.sharePassword)
  → jwt.sign({ fileId, type: "share" }, JWT_SECRET, { expiresIn: "15m" })
  → Return: { accessToken }

Download request:
  → GET /api/files/download/:id?accessToken=<jwt>
  → Verify JWT (owner's JWT  OR  15-min access JWT)
  → Check share expiry + download limit
  → File.findByIdAndUpdate({ $inc: { downloadCount: 1 } })
  → If shareMaxDownloads reached → update file to disable share link
  → fs.createReadStream(file.path).pipe(res)   ← streaming, never fully buffered
  → activityLogger.log({ action: "file.downloaded" })
  → webhookController.triggerEvent("file.downloaded", payload)
  → If notificationPrefs.onDownload → sendMail to owner
```

### Webhook Delivery

```
Any file event fires
  → webhookController.triggerEvent(event, payload)
  → Find all active Webhooks where events includes this event type
  → For each webhook:
        → Build payload: { event, timestamp, data: payload }
        → Sign: hmac = crypto.createHmac("sha256", webhook.secret)
                              .update(JSON.stringify(payload))
                              .digest("hex")
        → Add header: X-VaultFS-Signature: sha256=<hmac>
        → axios.post(webhook.url, payload, { headers })
        → On success:
              → Webhook.updateOne({ totalFired++, lastFiredAt: now })
        → On failure (network / non-2xx):
              → Webhook.updateOne({ failureCount++ })
              → Retry with exponential backoff (3 attempts)
              → Log delivery result to webhook.deliveryLogs[]
```

---

## 🔒 Security Implementation

| Feature | Implementation | Detail |
|---|---|---|
| **Password hashing** | bcryptjs · 12 salt rounds | Constant-time `bcrypt.compare()` |
| **Session tokens** | JWT signed with `JWT_SECRET` | 7-day expiry · stored in localStorage |
| **XSS mitigation** | Content Security Policy (CSP) | Applied via Helmet.js |
| **Two-Factor Auth** | TOTP via speakeasy (RFC 6238) | 30-second window · QR code setup |
| **Device trust** | FingerprintJS → `Device` model | Unknown devices trigger email alert |
| **File access control** | Ownership verified on every request | Share tokens for public access |
| **Rate limiting** | express-rate-limit | 10 uploads/min · 200 requests/15 min per IP |
| **Input validation** | express-validator + Joi schemas | Runs before every handler |
| **Security headers** | Helmet.js | HSTS · X-Frame-Options · X-Content-Type-Options · CSP |
| **CORS** | Restricted to `CLIENT_URL` | All other origins rejected |
| **Webhook signing** | HMAC-SHA256 | Per-endpoint secret · consumers must verify |
| **Encryption at rest** | Optional AES-256-CBC (crypto-js) | Client-side before upload |
| **Gzip compression** | `compression` middleware | All API responses compressed |

---

## 🧪 Development vs Production

| Aspect | Development | Production |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| API routing | Vite dev server proxies `/api` → `localhost:5000` | Express serves `client/dist/` statically |
| File storage | `server/uploads/` on local disk | **Persistent volume required** (NFS, EBS, EFS…) |
| Email delivery | Logs to console if SMTP is missing | Real delivery via Nodemailer SMTP |
| HTTP logging | Morgan `dev` format (colorized, concise) | Morgan `combined` format (Apache-style) |
| Source maps | Enabled (Vite HMR) | Disabled (production build) |
| CSP headers | Relaxed (allows eval for HMR) | Full Helmet.js protection |
| Error stack traces | Full stack in responses | Stack hidden · generic error messages only |

---

## 📜 NPM Scripts

| Command | Description |
|---|---|
| `npm run install:all` | Install dependencies in root, `client/`, and `server/` |
| `npm run dev` | Run Vite dev server + Express with nodemon concurrently |
| `npm run build` | Build optimized production frontend bundle → `client/dist/` |
| `npm run server` | Start backend only in dev mode (nodemon auto-restart) |
| `npm run client` | Start Vite frontend dev server only |
| `cd client && npm run lint` | ESLint check across the frontend codebase |
| `cd server && npm run start` | Production backend start (no nodemon) |
| `cd server && node scripts/cleanOrphans.js` | Remove orphaned files from disk |
| `cd server && node scripts/migrateHashes.js` | Backfill SHA-256 hashes on legacy files |

---

## 🙏 Key Dependencies

### Frontend

| Library | Version | Purpose |
|---|---|---|
| `react` + `react-dom` | 18 | Core UI library |
| `vite` | 8 | Build tool + HMR dev server |
| `tailwindcss` | 3 | Utility-first CSS framework |
| `react-router-dom` | 6 | Client-side routing |
| `socket.io-client` | 4 | Real-time WebSocket client |
| `axios` | latest | HTTP client with JWT interceptors |
| `lucide-react` | latest | SVG icon set |
| `recharts` | latest | Admin dashboard charts |
| `react-hot-toast` | latest | Toast notification system |
| `react-dropzone` | latest | Drag-and-drop file upload zone |
| `react-dnd` | latest | Drag-and-drop for workflow builder |
| `date-fns` | latest | Date formatting and manipulation |
| `crypto-js` | latest | Client-side AES-256-CBC encryption |
| `@fingerprintjs/fingerprintjs` | latest | Device fingerprinting |
| `marked` | latest | Markdown → HTML rendering |
| `prismjs` | latest | Code syntax highlighting (30+ languages) |
| `mammoth` | latest | DOCX → HTML conversion |
| `xlsx` (SheetJS) | latest | XLSX / CSV → interactive table |
| `jszip` | latest | PPTX slide text extraction |
| `epubjs` | latest | EPUB reader |

### Backend

| Library | Version | Purpose |
|---|---|---|
| `express` | 4 | HTTP server + REST API framework |
| `mongoose` | latest | MongoDB ODM |
| `socket.io` | 4 | WebSocket server for real-time events |
| `passport` + strategies | latest | OAuth2 (Google, GitHub) |
| `jsonwebtoken` | latest | JWT generation and verification |
| `bcryptjs` | latest | Password hashing (12 rounds) |
| `speakeasy` | latest | TOTP 2FA implementation |
| `qrcode` | latest | QR code generation for 2FA setup |
| `multer` | latest | Multipart form-data file uploads |
| `sharp` | latest | Image thumbnails · EXIF strip · compression |
| `nodemailer` | latest | SMTP email transport |
| `helmet` | latest | HTTP security headers |
| `express-rate-limit` | latest | Per-endpoint rate limiting |
| `express-validator` | latest | Request input validation |
| `compression` | latest | Gzip response compression |
| `morgan` | latest | HTTP request logging |
| `archiver` | latest | ZIP archive creation for bulk downloads |
| `unzipper` | latest | ZIP archive extraction |
| `cors` | latest | CORS policy enforcement |
| `@aws-sdk/client-s3` | latest | S3 backup workflow action (optional) |
| `openai` | latest | AI features — folder suggestions, image desc (optional) |

---

## ⚠️ Important Production Notes

> **Read all of these before going live.**

**🗄️ Persistent File Storage**
The `server/uploads/` directory MUST be backed by a persistent volume. In Docker or Kubernetes, mount an external volume (NFS, AWS EBS, Azure Disk, etc.). Without it, every container restart wipes all uploaded files.

**🔑 JWT Secret**
Set `JWT_SECRET` to a cryptographically random string of at least 64 characters before deploying. Use `openssl rand -hex 64` to generate one. Never commit it to version control — store it in your CI/CD secrets manager or `.env` file outside the repo.

**📧 SMTP is Mandatory**
Password reset, email verification, share notifications, and suspicious login alerts all require a working SMTP server. The app logs errors but does not crash on email failure — meaning users silently cannot reset passwords if SMTP is broken.

**🌐 Reverse Proxy Required**
Run behind nginx or Caddy with SSL/TLS termination. Configure `X-Forwarded-For` and `X-Real-IP` headers so that express-rate-limit applies limits per real client IP, not per proxy IP.

**⚖️ Horizontal Scaling**
The default file store is local disk — a single node only. For multiple app instances, use shared network storage (NFS, AWS EFS) or replace the upload target with an S3-compatible bucket. The workflow engine ships with an S3 backup action out of the box.

**🔐 First Admin Account**
The first registered user receives `role: "admin"` automatically. All subsequent registrations default to `role: "user"`. Change this behavior in `authController.js` if needed.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Please check the [issues page](../../issues) before opening a new one.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request against `main`

Please follow the existing code style and add comments for any non-obvious logic.

---

## 📄 License

Released under the **[MIT License](./LICENSE)** — for personal and commercial use.

---

<div align="center">

Built with ❤️ for secure, self-hosted file management

**VaultFS** — Your files. Your server. Your rules.

🌐 [Live Demo](https://vaultfs-enterprise-file-management-system-production.up.railway.app/) &nbsp;·&nbsp; 🔗 [GitHub](https://github.com/kanhaiyaray/VaultFS-Enterprise-File-Management-System)

</div>
