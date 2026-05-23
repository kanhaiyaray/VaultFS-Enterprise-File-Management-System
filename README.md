# VaultFS — Enterprise File Management System

<div align="center">

### Enterprise-Grade Self-Hosted File Management System

<p>
  <img src="https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/MongoDB-6%2B-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-4-010101?style=for-the-badge&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-F59E0B?style=for-the-badge" />
</p>

> A production-ready, self-hosted file management platform built for teams and enterprises.  
> Secure sharing · Real-time collaboration · Full admin control · Dark-themed modern UI.


</div>

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js 20+, Express |
| Database | MongoDB 6+ (Mongoose ODM) |
| Real-time | Socket.IO |
| Auth | JWT, Passport.js (OAuth), speakeasy (TOTP) |
| File Processing | Sharp (images), Multer (uploads) |
| Email | Nodemailer (SMTP) |

---

## What VaultFS Actually Is

- A **Node.js monorepo** with a Vite-powered React frontend and an Express API backend.
- Files are stored **on disk** in `server/uploads/` — not in MongoDB, not in S3. In production, this directory must be backed by a persistent volume. If you deploy to a container without persistent storage, uploaded files will be lost on restart.
- MongoDB stores all metadata: users, file records, shares, webhooks, activity logs, etc.
- There is **no built-in CDN**, no object storage abstraction, and no horizontal scaling story for the file store out of the box. For high-availability deployments, you will need to handle shared storage (NFS, S3-compatible volumes, etc.) yourself.
- Email in development will fall back to console logging if no SMTP config is provided. In production, you must configure a real SMTP server.

---

## Prerequisites

Before you touch the installation steps, make sure you actually have:

- **Node.js 20+** — not 18, not 16. The codebase targets Node 20.
- **MongoDB 6+** — running locally or accessible via connection string.
- **npm 9+** — comes with Node 20 by default.
- An **SMTP server or service** (Gmail, SendGrid, Postmark, etc.) — required for email verification, password reset, and notifications to work.
- A domain and SSL certificate if you are deploying for real users. Running over plain HTTP in production is not acceptable for an auth-dependent system.

---

## Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/vaultfs.git
cd vaultfs

# 2. Install all dependencies (root + client + server)
npm run install:all

# 3. Configure environment
cp .env.example server/.env
# Edit server/.env — do not skip this step

# 4. Start development servers
npm run dev
# → API Server:  http://localhost:5000
# → React Client: http://localhost:5173
```

### Production Deployment

```bash
# Build the React frontend
npm run build

# Start the Express server
NODE_ENV=production node server/index.js
```

In production, the Express server serves the built React app from `client/dist`. You should run this behind a reverse proxy (nginx, Caddy) with SSL. Do not expose the Express server directly on port 80/443 without hardening.

---

## Environment Variables

### Server (`server/.env`)

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGO_URI=mongodb://127.0.0.1:27017/vaultfs

# Security — change JWT_SECRET to a long random string before deploying
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Email (SMTP) — required for auth flows to work
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM="VaultFS <noreply@vaultfs.com>"

# OAuth (optional — leave blank to disable)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# File limits
MAX_FILE_SIZE=52428800            # 50 MB per file
DEFAULT_STORAGE_LIMIT=5368709120  # 5 GB per user
```

### Client (`client/.env`)

```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## Features

### Authentication & Security

- JWT-based sessions (7-day expiry, stored in `localStorage` — not `httpOnly` cookies).
- OAuth 2.0 via Google and GitHub.
- TOTP-based Two-Factor Authentication with QR code setup.
- Password reset via email token flow.
- Email verification on registration.
- Rate limiting: 10 uploads/min, 200 API requests per 15 minutes.
- Temporary and permanent user bans.
- GDPR-compliant account data export and self-deletion.

> **Note on JWT storage:** Sessions are stored in `localStorage`, which is accessible to JavaScript. This is a known XSS risk tradeoff. The codebase mitigates this with Helmet.js CSP headers, but it is worth understanding before deploying in high-security environments.

---

### File Management

- Drag-and-drop upload with progress indicators.
- Import files directly from public URLs.
- File versioning with one-click restore.
- SHA-256-based deduplication — identical files share storage.
- Bulk operations: delete, ZIP download, batch tag editing.
- 30-day soft-delete trash with permanent deletion.
- Starred files and custom color labels.
- Rule-based Smart Folders (client-side filtering — not server-side queries).

---

### File Preview Engine

| Type | Technology |
|---|---|
| Images | Sharp — compression, EXIF stripping, thumbnails |
| Video / Audio | HTML5 native player |
| PDF | Embedded iframe viewer |
| DOCX | Mammoth.js (client-side conversion) |
| XLSX / CSV | SheetJS (client-side parsing) |
| PPTX | JSZip text extraction |
| Code | Prism.js (30+ languages) |
| Markdown | Marked.js with live split-pane editor |

---

### Sharing & Collaboration

- Share links with optional: password protection, expiry dates, download limits, view-only mode.
- Public gallery of shared files.
- Team workspaces with role-based access: owner, admin, editor, viewer.
- File Requests — public upload links that accept submissions from unauthenticated users, with email capture, file size limits, and submission caps.
- Real-time activity feed via Socket.IO.

---

### Organization

- Full-text search with boolean operators (AND/OR/NOT) and saved searches.
- Smart Folders — virtual collections based on rules (MIME type, tags, date, size, starred status). These are evaluated client-side, not as persistent server-side queries.
- Color labels with filter support.
- File diff viewer for side-by-side comparison of text files or versions.

---

### Admin Dashboard

- **User management:** create, edit, ban/unban, force password reset, impersonate users, CSV export.
- **File oversight:** browse all files across all users, full-text search, delete, identify storage hogs, clean up orphaned files.
- **System stats:** storage analytics, upload trends, MIME type breakdowns, top uploaders.
- **Activity log:** full audit trail, filterable by action, user, date, and IP address.
- **Announcements:** broadcast messages to all users or admins only, with email fallback.
- **Branding:** custom logo, favicon, colors, maintenance mode, per-feature toggles.

---

### Integrations & Webhooks

- Webhooks with HMAC-SHA256 signed payloads, per-event filters, and per-user limits (10 webhooks per user).
- Email notifications for downloads, share confirmations, and file request submissions.
- Rate limiting and bandwidth tracking per user.

---

## Architecture

```
vaultfs/
├── client/                    # React 18 + Vite frontend
│   ├── src/
│   │   ├── components/        # 16+ reusable components
│   │   ├── pages/             # 14 route pages
│   │   ├── context/           # AuthContext, BrandingProvider
│   │   ├── hooks/             # useSocket, useLocalStorage
│   │   ├── utils/             # Axios client, helpers
│   │   └── styles/            # Tailwind CSS
│   └── ...
├── server/                    # Node.js/Express API
│   ├── controllers/           # 13 controllers
│   ├── models/                # 9 Mongoose models
│   ├── routes/                # 10 route modules
│   ├── middleware/            # auth, upload, rate limiter
│   ├── utils/                 # email, socket, passport, activity logger
│   └── uploads/               # user file storage (gitignored — needs persistent volume in prod)
└── package.json               # workspace scripts
```

---

## API Reference

### Public Endpoints (no authentication required)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/branding` | Get branding config |
| GET | `/api/files/share/:token` | Get share metadata |
| POST | `/api/files/share/:token/access` | Unlock password-protected share |
| GET | `/api/file-requests/:slug` | Get file request info |
| POST | `/api/file-requests/:slug/submit` | Submit files to a request |

### Authenticated Endpoints

| Category | Base Path | Key Operations |
|---|---|---|
| Auth | `/api/auth/*` | Login, register, 2FA, password reset, email verification |
| Files | `/api/files/*` | CRUD, upload, download, search, versioning, trash |
| Users | `/api/users/me/*` | Profile, notifications, data export, deletion |
| Team | `/api/team/*` | Create, invite, manage roles |
| File Requests | `/api/file-requests/*` | Create and manage upload links |
| Webhooks | `/api/webhooks/*` | CRUD and test delivery |

### Admin Endpoints (`/api/admin/*`)

| Category | Operations |
|---|---|
| Users | Full CRUD, ban, impersonate, force password reset, CSV export |
| Files | Browse all, full-text search, delete, storage analysis, orphan cleanup |
| Stats | System metrics, upload trends, MIME breakdown |
| Activity | Complete audit log with multi-field filters |
| Announcements | Create, list, remove broadcast messages |
| Branding | Full UI customization controls |

---

## Database Models

| Model | Key Fields |
|---|---|
| User | `username`, `email`, `password`, `role`, `twoFactorSecret`, `storageUsed`, `isBanned`, OAuth IDs |
| File | `versions[]`, `shareToken`, `sharePassword`, `tags`, `labels`, `isDeleted`, `hash` |
| FileRequest | `slug`, `maxSubmissions`, `expiresAt`, `requireEmail`, `allowedTypes`, `submissions[]` |
| Webhook | `url`, `secret`, `events[]`, `isActive`, `totalFired`, `failureCount` |
| Branding | `primaryColor`, `logoUrl`, `faviconUrl`, `maintenanceMode`, `features{}`, `limits{}` |
| Announcement | `subject`, `message`, `targetRole`, `isActive`, `createdBy` |
| Activity | `user`, `action`, `details`, `ip`, `userAgent` |
| PasswordReset | `userId`, `token`, `expiresAt` (TTL index), `used` |
| Team | `name`, `owner`, `inviteCode`, `members[{ userId, role }]` |

---

## Key Data Flows

### Authentication

```
LoginPage → AuthContext.login()
  → POST /api/auth/login
  → JWT stored in localStorage
  → api.js interceptor adds Authorization header
  → AuthContext.refreshUser() → GET /api/auth/me
```

### File Upload

```
UploadPage → Dropzone → handleUpload()
  → POST /api/files/upload (multipart/form-data)
  → Multer saves to disk
  → Sharp processes images (compress + thumbnail)
  → SHA-256 hash checked for deduplication
  → File document created in MongoDB
  → User.storageUsed incremented
  → Socket.IO emits "activity" event to connected clients
  → Webhook triggered (if configured)
```

### Webhook Delivery

```
Event occurs (file.uploaded, file.deleted, …)
  → triggerWebhook() fetches active webhooks for the user
  → For each webhook: dispatches signed POST (HMAC-SHA256)
  → Webhook document updated: lastFiredAt, statusCode, failureCount
```

---

## Security Implementation

| Feature | Implementation |
|---|---|
| Password hashing | bcryptjs (12 salt rounds) |
| Session management | JWT (7 days), stored in `localStorage` |
| Two-Factor Auth | TOTP via speakeasy, QR code setup |
| File access control | Ownership check on every file request |
| Rate limiting | `express-rate-limit` per endpoint group |
| Input validation | `express-validator` + Joi schemas |
| Security headers | Helmet.js with custom CSP |
| CORS | Restricted to `CLIENT_URL` origin only |
| Webhook signing | HMAC-SHA256 on all outgoing payloads |

---

## Development Scripts

```bash
# Install all workspace dependencies
npm run install:all

# Run both dev servers concurrently (Vite + Nodemon)
npm run dev

# Lint the React frontend
cd client && npm run lint

# Build production-optimized frontend bundle
npm run build

# Run Express server in production mode
NODE_ENV=production node server/index.js
```

### Environment Behavior Differences

| Behavior | Development | Production |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| API Proxy | Vite proxies `/api` to `localhost:5000` | Served from `client/dist` |
| Socket.IO | WebSocket + polling fallback | Same |
| File storage | `server/uploads/` (local) | Must use a persistent volume |
| Email delivery | Console log if no SMTP config | Real delivery via Nodemailer |

---

## Dependencies & Acknowledgements

| Library | Purpose |
|---|---|
| Sharp | Server-side image compression, EXIF stripping, thumbnail generation |
| Socket.IO | Real-time activity events |
| Prism.js | Code syntax highlighting (30+ languages) |
| Marked.js | Markdown rendering |
| Mammoth.js | DOCX to HTML conversion (client-side) |
| SheetJS | Excel/CSV parsing (client-side) |
| JSZip | PPTX text extraction (client-side) |
| Tailwind CSS | Utility-first styling |
| Lucide Icons | SVG icon library |
| Recharts | React charts for admin dashboard |
| bcryptjs | Password hashing |
| speakeasy | TOTP 2FA implementation |
| Helmet.js | HTTP security headers |
| Multer | Multipart file upload handling |
| Nodemailer | SMTP email delivery |
| Passport.js | OAuth 2.0 strategy handling |

---

## License

Released under the **MIT License** — free for personal and commercial use. See `LICENSE` for full terms.