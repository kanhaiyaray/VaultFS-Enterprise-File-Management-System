/**
 * server/index.js
 * VaultFS Express server — entry point.
 *
 * Starts HTTP server with Socket.IO, connects to MongoDB,
 * mounts all route groups, and wires up error handling.
 */
require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { startEngine: startWorkflowEngine } = require("./utils/workflowEngine");
const { setIO } = require("./utils/socket");

// ── Passport OAuth configuration ─────────────────────────────────────────────
const passport = require("./utils/passport");

// ── Create app & HTTP server ──────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.locals.io = io;
setIO(io);

// ── Socket authentication middleware ─────────────────────────────────────────
const jwt = require("jsonwebtoken");
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication required"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.join(`user:${decoded.id}`);
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log(`Socket connected: user ${socket.userId}`);
  socket.on("disconnect", () => {
    console.log(`Socket disconnected: user ${socket.userId}`);
  });
});

// ── Security & utility middleware ────────────────────────────────────────────
app.use(
  helmet({
    crossOriginEmbedderPolicy: false, // allow iframe embeds
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",                // required for frontend
          "https://cdnjs.cloudflare.com",   // Prism.js, Marked, etc.
          "https://cdn.jsdelivr.net",       // additional CDN
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",                // required for frontend
          "https://cdnjs.cloudflare.com",   // Prism themes
          "https://fonts.googleapis.com",   // Google Fonts
        ],
        imgSrc: ["'self'", "data:"],
        connectSrc: [
          "'self'",
          process.env.CLIENT_URL || "http://localhost:5173",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",      // Google Fonts
          "data:",
        ],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
  })
);

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(passport.initialize());

// ── 🛡️ REMOVED STATIC /uploads ROUTE – all file access now goes through
//    the authenticated /api/files/download/:id endpoint.

// ── API routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/files", require("./routes/files"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/users", require("./routes/users"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/workflows", require("./routes/workflows"));
app.use("/api/announcements", require("./routes/announcements"));
app.use("/api/webhooks", require("./routes/webhooks"));
app.use("/api/branding", require("./routes/branding"));
app.use("/api/team", require("./routes/team"));
app.use("/api/file-requests", require("./routes/fileRequests"));

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "3.1.0", timestamp: new Date().toISOString() });
});

// ── Global error handler (hidden details in production) ─────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[Error]", err.message);
  const status = err.statusCode || err.status || 500;
  // In production, do not leak internal error details
  const message = process.env.NODE_ENV === "production"
    ? "Internal server error"
    : err.message || "Internal server error";
  res.status(status).json({ success: false, message });
});

// ── Connect to MongoDB then start server ─────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/vaultfs";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    
    // ── Verify Supabase storage configuration ────────────────────────────────
    try {
      const supabase = require("./utils/supabase");
      if (supabase.supabaseAdmin) {
        console.log("✅ Supabase storage configured");
        console.log(`   📦 Bucket: ${supabase.SUPABASE_BUCKET}`);
      } else {
        console.warn("⚠️ Supabase not configured — using local storage");
        console.warn("   Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env to enable");
      }
    } catch (err) {
      console.warn("⚠️ Supabase module not found — using local storage only");
    }
    
    startWorkflowEngine();
    server.listen(PORT, () => {
      console.log(`🚀 VaultFS server running on http://localhost:${PORT}`);
      console.log(`NODE_ENV = ${process.env.NODE_ENV}`);
      console.log(`🔒 Static /uploads route is DISABLED – all file access via /api/files/download/:id`);
      console.log(`📦 Frontend is NOT served from here – Vercel handles the UI.`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = { app, io };