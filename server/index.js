/**
 * server/index.js
 * VaultFS Express server — entry point.
 */
require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const { startEngine: startWorkflowEngine } = require("./utils/workflowEngine");
const { setIO } = require("./utils/socket");
const passport = require("./utils/passport");

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
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://cdn.jsdelivr.net",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
        ],
        imgSrc: ["'self'", "data:"],
        connectSrc: [
          "'self'",
          process.env.CLIENT_URL || "http://localhost:5173",
          process.env.SERVER_URL || "http://localhost:5000",
          "http://localhost:5000",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "data:",
        ],
        frameSrc: ["'self'"],
        // ✅ ALLOW FRAMING FROM YOUR FRONTEND ORIGIN
        frameAncestors: [
          "'self'",
          process.env.CLIENT_URL || "http://localhost:5173",
          "https://vault-fs-enterprise-file-management.vercel.app",
        ],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
      },
    },
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://vault-fs-enterprise-file-management.vercel.app",
  "http://localhost:5173",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "cache-control"],
  })
);

app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(passport.initialize());

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

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "3.1.0", timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error("[Error]", err.message);
  const status = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === "production"
    ? "Internal server error"
    : err.message || "Internal server error";
  res.status(status).json({ success: false, message });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/vaultfs";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    console.log("📦 Using local file storage (server/uploads/)");
    startWorkflowEngine();
    server.listen(PORT, () => {
      console.log(`🚀 VaultFS server running on http://localhost:${PORT}`);
      console.log(`NODE_ENV = ${process.env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = { app, io };