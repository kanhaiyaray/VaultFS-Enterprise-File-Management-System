/**
 * server/index.js
 * VaultFS Express server — entry point.
 *
 * Starts HTTP server with Socket.IO, connects to MongoDB,
 * mounts all route groups, and wires up error handling.
 */
require("dotenv").config();

const express     = require("express");
const http        = require("http");
const path        = require("path");
const cors        = require("cors");
const helmet      = require("helmet");
const morgan      = require("morgan");
const compression = require("compression");
const mongoose    = require("mongoose");
const { Server }  = require("socket.io");
const { setIO }   = require("./utils/socket");

// ── Passport OAuth configuration ─────────────────────────────────────────────
const passport = require("./utils/passport");

// ── Create app & HTTP server ──────────────────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ── Socket.IO ────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Expose io to controllers via app.locals
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
app.use(helmet({
  crossOriginEmbedderPolicy: false,      // allow iframe embeds
  contentSecurityPolicy: false,           // handled separately if needed
}));
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(passport.initialize());

// ── Serve uploaded files as static ───────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ── API routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/files",     require("./routes/files"));
app.use("/api/users",     require("./routes/users"));
app.use("/api/admin",     require("./routes/admin"));
app.use("/api/announcements", require("./routes/announcements"));
app.use("/api/webhooks",  require("./routes/webhooks"));
app.use("/api/branding",  require("./routes/branding"));
app.use("/api/team",      require("./routes/team"));
app.use("/api/file-requests", require("./routes/fileRequests"));

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "3.1.0", timestamp: new Date().toISOString() });
});

// ── Serve React build in production ──────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const clientBuild = path.join(__dirname, "../client/dist");
  app.use(express.static(clientBuild));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientBuild, "index.html"));
  });
}

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[Error]", err.message);
  const status  = err.statusCode || err.status || 500;
  const message = err.message    || "Internal server error";
  res.status(status).json({ success: false, message });
});

// ── Connect to MongoDB then start server ─────────────────────────────────────
const PORT     = process.env.PORT     || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/vaultfs";

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () => {
      console.log(`🚀 VaultFS server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

module.exports = { app, io };
