/**
 * middleware/upload.js
 * Multer configuration for file uploads.
 * Files are stored in server/uploads/<userId>/<timestamp-hash>.<ext>
 */
const multer = require("multer");
const path   = require("path");
const fs     = require("fs");
const crypto = require("crypto");
const { fileTypeFromBuffer } = require("file-type");

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024; // 50MB

// ── Allowed MIME types ────────────────────────────────────────────────────────
const ALLOWED_TYPES = new Set([
  // Allow fallback for browsers that send unknown types
  "application/octet-stream", // ← Added to accept files with generic MIME

  "image/jpeg","image/png","image/gif","image/webp","image/svg+xml",
  "application/pdf","application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain","text/csv","text/markdown",
  "application/zip","application/x-zip-compressed",
  "application/x-tar","application/gzip",
  "video/mp4","video/webm","video/quicktime",
  "audio/mpeg","audio/wav","audio/ogg","audio/flac",
  "application/json","text/javascript","text/html","text/css",
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(__dirname, "../uploads", req.user.id.toString());
    if (!fs.existsSync(userDir)) fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept if MIME is in ALLOWED_TYPES
  if (ALLOWED_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter,
});

// ── Magic‑byte validation (anti‑MIME spoofing) ─────────────────────────────
async function validateFileMagic(file) {
  // Read the first 4100 bytes (enough for most magic numbers)
  const buffer = await fs.promises.readFile(file.path, { length: 4100 });
  const detected = await fileTypeFromBuffer(buffer);

  // If we detected a MIME type, it must be in the allowed list
  if (detected) {
    if (!ALLOWED_TYPES.has(detected.mime)) {
      throw new Error(`Detected file type "${detected.mime}" is not allowed.`);
    }
    return;
  }

  // No magic detected (e.g., plain text, CSV, etc.)
  const SAFE_UNDETECTABLE = new Set([
    "application/octet-stream", // ← Added: allow fallback when no magic detected
    "text/plain", "text/csv", "text/markdown",
    "application/json", "text/javascript", "text/html", "text/css",
    "application/xml", "text/xml",
  ]);
  if (!SAFE_UNDETECTABLE.has(file.mimetype)) {
    throw new Error(`File type could not be verified and is not in the safe‑list.`);
  }
}

// ── Middleware: validate all uploaded files after Multer ────────────────────
async function validateFiles(req, res, next) {
  if (!req.files) {
    return next();
  }

  const fileList = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();

  try {
    for (const file of fileList) {
      await validateFileMagic(file);
    }
    next();
  } catch (err) {
    // Delete any uploaded files that passed Multer but failed validation
    for (const file of fileList) {
      try {
        if (file.path && fs.existsSync(file.path)) {
          await fs.promises.unlink(file.path);
        }
      } catch { /* ignore */ }
    }
    return next(new Error(err.message));
  }
}

// ── Convert Multer errors to clean API responses ──────────────────────────────
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB.`,
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = { upload, validateFiles, handleMulterError };