/**
 * ═══════════════════════════════════════════════════════════════════
 *  VaultFS — adminController.js
 *  Full admin CRUD: users, files, system, announcements, branding
 * ═══════════════════════════════════════════════════════════════════
 */

const User         = require("../models/User");
const crypto = require("crypto");
const File         = require("../models/File");
const Branding     = require("../models/Branding");
const Announcement = require("../models/Announcement");   // ✅ Fixed: missing import
const Activity     = require("../models/Activity");
const jwt          = require("jsonwebtoken");
const fs           = require("fs");
const path         = require("path");
const { sendMail } = require("../utils/sendMail");

// ── helpers ───────────────────────────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }
  next();
};

// ═══════════════════════════════
//  USER MANAGEMENT
// ═══════════════════════════════

// GET /api/admin/users
const getUsers = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 25, search = "", role, status, sortBy = "createdAt", order = "desc",
    } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { username:    { $regex: search, $options: "i" } },
        { email:       { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
      ];
    }
    if (role)   query.role = role;
    if (status === "banned")   query.isBanned = true;
    if (status === "active")   query.isBanned = { $ne: true };
    if (status === "verified") query.emailVerified = true;
    if (status === "unverified") query.emailVerified = { $ne: true };

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ [sortBy]: order === "asc" ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select("-password -twoFactorSecret -emailVerifyToken");

    // Attach file count per user
    const userIds = users.map((u) => u._id);
    const fileCounts = await File.aggregate([
      { $match: { owner: { $in: userIds }, isDeleted: false } },
      { $group: { _id: "$owner", count: { $sum: 1 } } },
    ]);
    const fileCountMap = Object.fromEntries(fileCounts.map((f) => [f._id.toString(), f.count]));

    const enriched = users.map((u) => ({
      ...u.toObject(),
      fileCount: fileCountMap[u._id.toString()] || 0,
    }));

    res.json({
      success: true,
      users: enriched,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

// GET /api/admin/users/:id
const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password -twoFactorSecret -emailVerifyToken");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    const fileCount = await File.countDocuments({ owner: user._id, isDeleted: false });
    const trashCount = await File.countDocuments({ owner: user._id, isDeleted: true });
    res.json({ success: true, user: { ...user.toObject(), fileCount, trashCount } });
  } catch (err) { next(err); }
};

// PUT /api/admin/users/:id
const updateUser = async (req, res, next) => {
  try {
    const allowed = ["displayName", "email", "role", "storageLimit", "emailVerified", "isBanned",
                     "banReason", "banUntil", "twoFactorEnabled"];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (req.params.id === req.user.id && updates.role) {
      return res.status(400).json({ success: false, message: "You cannot change your own role." });
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true })
      .select("-password -twoFactorSecret -emailVerifyToken");

    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, user, message: "User updated." });
  } catch (err) { next(err); }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account." });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    // Remove all their files from disk
    const files = await File.find({ owner: user._id });
    for (const file of files) {
      try {
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        if (file.thumbnailPath && fs.existsSync(file.thumbnailPath)) fs.unlinkSync(file.thumbnailPath);
      } catch {}
    }
    await File.deleteMany({ owner: user._id });
    await user.deleteOne();

    res.json({ success: true, message: `User "${user.username}" and all their files deleted.` });
  } catch (err) { next(err); }
};

// POST /api/admin/users/:id/ban
const banUser = async (req, res, next) => {
  try {
    const { reason = "Violated terms of service", duration } = req.body; // duration in hours, null = permanent
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: "You cannot ban yourself." });
    }
    const banUntil = duration ? new Date(Date.now() + duration * 3600_000) : null;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: true, banReason: reason, banUntil },
      { new: true },
    ).select("-password -twoFactorSecret -emailVerifyToken");

    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    // Emit ban via socket if available
    const { getIO } = require("../utils/socket");
    try {
      const io = getIO();
      const sockets = await io.in(`user:${user._id}`).fetchSockets();
      sockets.forEach((s) => {
        s.emit("activity", {
          type:      "banned",
          payload:   { message: `Your account has been suspended: ${reason}` },
          timestamp: new Date(),
        });
      });
    } catch {}

    res.json({ success: true, user, message: `User banned${banUntil ? ` until ${banUntil.toISOString()}` : " permanently"}.` });
  } catch (err) { next(err); }
};

// POST /api/admin/users/:id/unban
const unbanUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: false, banReason: null, banUntil: null },
      { new: true },
    ).select("-password -twoFactorSecret -emailVerifyToken");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    res.json({ success: true, user, message: "User unbanned." });
  } catch (err) { next(err); }
};

// POST /api/admin/users/:id/force-reset
const forcePasswordReset = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const crypto = require("crypto");
    const PasswordReset = require("../models/PasswordReset");
    await PasswordReset.deleteMany({ userId: user._id });

    const rawToken  = crypto.randomBytes(32).toString("hex");
    const hashedTok = crypto.createHash("sha256").update(rawToken).digest("hex");
    await PasswordReset.create({ userId: user._id, token: hashedTok, expiresAt: new Date(Date.now() + 24 * 3600_000) });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}&id=${user._id}`;

    await sendMail({
      to:      user.email,
      subject: "Action Required — Reset Your VaultFS Password",
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f0f13;border-radius:12px;border:1px solid #2a2a3d;color:#e2e2e8;">
          <h2 style="color:#f59e0b;">Password Reset Required</h2>
          <p>Hi <strong>${user.displayName || user.username}</strong>,</p>
          <p>An administrator has requested that you reset your password. Please click the button below within 24 hours.</p>
          <a href="${resetUrl}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">Reset Password</a>
        </div>
      `,
    });

    res.json({ success: true, message: "Password reset email sent to user." });
  } catch (err) { next(err); }
};

// POST /api/admin/users/:id/impersonate
const impersonateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password -twoFactorSecret -emailVerifyToken");
    if (!user) return res.status(404).json({ success: false, message: "User not found." });
    if (user.role === "admin" && req.user.id !== user._id.toString()) {
      return res.status(403).json({ success: false, message: "Cannot impersonate another admin." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, impersonatedBy: req.user.id },
      process.env.JWT_SECRET,
      { expiresIn: "2h" },
    );

    res.json({ success: true, token, user, message: `Impersonating ${user.username} (2h session).` });
  } catch (err) { next(err); }
};

// POST /api/admin/users/create
const createUser = async (req, res, next) => {
  try {
    const { username, email, password, role = "user", storageLimit } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, message: "Username, email, and password are required." });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ success: false, message: "Username or email already exists." });
    }

    const defaultStorage = (storageLimit || parseInt(process.env.DEFAULT_STORAGE_LIMIT) || 5 * 1024 * 1024 * 1024);

    const user = await User.create({
      username,
      email,
      password,
      role,
      storageLimit:  defaultStorage,
      emailVerified: true,
    });

    res.status(201).json({ success: true, user, message: "User created." });
  } catch (err) { next(err); }
};

// GET /api/admin/users/export
const exportUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password -twoFactorSecret -emailVerifyToken");

    const escapeCsv = (value) => {
      if (value == null) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      "id", "username", "email", "displayName", "role",
      "storageUsed", "storageLimit", "uploadCount",
      "emailVerified", "isBanned", "createdAt"
    ];

    const rows = users.map((u) => [
      u._id,
      u.username,
      u.email,
      u.displayName || "",
      u.role,
      u.storageUsed,
      u.storageLimit,
      u.uploadCount || 0,
      u.emailVerified,
      u.isBanned || false,
      u.createdAt.toISOString(),
    ].map(escapeCsv).join(","));

    const csv = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="vaultfs-users-${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) { next(err); }
};

// ═══════════════════════════════
//  FILE OVERSIGHT
// ═══════════════════════════════

// GET /api/admin/files
const getAllFiles = async (req, res, next) => {
  try {
    const { page = 1, limit = 30, search = "", userId, mimetype } = req.query;
    const query = { isDeleted: false };
    if (search) {
      query.$or = [
        { originalName: { $regex: search, $options: "i" } },
        { description:  { $regex: search, $options: "i" } },
        { tags:         { $elemMatch: { $regex: search, $options: "i" } } },
      ];
    }
    if (userId) query.owner = userId;
    if (mimetype) query.mimetype = { $regex: mimetype, $options: "i" };

    const total = await File.countDocuments(query);
    const files = await File.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("owner", "username email displayName");

    res.json({
      success: true,
      files,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

// DELETE /api/admin/files/:id
const adminDeleteFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ success: false, message: "File not found." });

    if (!file.isDedup && file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    if (file.thumbnailPath && fs.existsSync(file.thumbnailPath)) fs.unlinkSync(file.thumbnailPath);

    await User.findByIdAndUpdate(file.owner, { $inc: { storageUsed: -file.size } });
    await File.findByIdAndDelete(file._id);

    res.json({ success: true, message: "File deleted by admin." });
  } catch (err) { next(err); }
};

// GET /api/admin/files/storage-hogs
const getStorageHogs = async (req, res, next) => {
  try {
    const files = await File.find({ isDeleted: false })
      .sort({ size: -1 })
      .limit(50)
      .populate("owner", "username email");
    res.json({ success: true, files });
  } catch (err) { next(err); }
};

// GET /api/admin/files/orphaned
const getOrphanedFiles = async (req, res, next) => {
  try {
    const userIds = (await User.find().select("_id")).map((u) => u._id);
    const files   = await File.find({ owner: { $nin: userIds } });
    res.json({ success: true, files, count: files.length });
  } catch (err) { next(err); }
};

// POST /api/admin/files/orphaned/cleanup
const cleanupOrphanedFiles = async (req, res, next) => {
  try {
    const userIds = (await User.find().select("_id")).map((u) => u._id);
    const orphans = await File.find({ owner: { $nin: userIds } });
    let cleaned = 0;
    for (const f of orphans) {
      try {
        if (f.path && fs.existsSync(f.path)) fs.unlinkSync(f.path);
        if (f.thumbnailPath && fs.existsSync(f.thumbnailPath)) fs.unlinkSync(f.thumbnailPath);
        await File.findByIdAndDelete(f._id);
        cleaned++;
      } catch {}
    }
    res.json({ success: true, cleaned, message: `${cleaned} orphaned file(s) removed.` });
  } catch (err) { next(err); }
};

// GET /api/admin/files/duplicates
const getDuplicateFiles = async (req, res, next) => {
  try {
    const dups = await File.aggregate([
      { $match: { isDeleted: false, hash: { $exists: true, $ne: null } } },
      { $group: { _id: "$hash", count: { $sum: 1 }, files: { $push: { id: "$_id", name: "$originalName", owner: "$owner", size: "$size" } } } },
      { $match: { count: { $gt: 1 } } },
      { $sort:  { count: -1 } },
      { $limit: 100 },
    ]);
    res.json({ success: true, duplicates: dups });
  } catch (err) { next(err); }
};

// ═══════════════════════════════
//  SYSTEM STATS
// ═══════════════════════════════

// GET /api/admin/stats
const getSystemStats = async (req, res, next) => {
  try {
    const [
      totalUsers, activeUsers, bannedUsers, verifiedUsers,
      totalFiles, totalTrash,
      storageSums,
      fileTypeBreakdown,
      recentUploads,
      topUploaders,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBanned: { $ne: true } }),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ emailVerified: true }),
      File.countDocuments({ isDeleted: false }),
      File.countDocuments({ isDeleted: true }),
      File.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: null, totalSize: { $sum: "$size" }, avgSize: { $avg: "$size" } } },
      ]),
      File.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: { $substr: ["$mimetype", 0, { $indexOfBytes: ["$mimetype", "/"] }] }, count: { $sum: 1 }, size: { $sum: "$size" } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      File.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(10).populate("owner", "username"),
      File.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$owner", fileCount: { $sum: 1 }, totalSize: { $sum: "$size" } } },
        { $sort: { totalSize: -1 } },
        { $limit: 10 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { $project: { fileCount: 1, totalSize: 1, "user.username": 1, "user.email": 1 } },
      ]),
    ]);

    const storageTotal = storageSums[0]?.totalSize || 0;
    const storageAvg   = storageSums[0]?.avgSize   || 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400_000);
    const uploadTrend = await File.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, isDeleted: false } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 }, size: { $sum: "$size" } } },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      stats: {
        users:    { total: totalUsers, active: activeUsers, banned: bannedUsers, verified: verifiedUsers },
        files:    { total: totalFiles, trash: totalTrash, totalSize: storageTotal, avgSize: storageAvg },
        fileTypeBreakdown,
        uploadTrend,
        recentUploads,
        topUploaders,
      },
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════
//  ANNOUNCEMENTS / BROADCAST
// ═══════════════════════════════

// POST /api/admin/announce
const broadcastAnnouncement = async (req, res, next) => {
  try {
    const { subject, message, sendEmail = false, targetRole } = req.body;
    if (!message) return res.status(400).json({ success: false, message: "Message is required." });
    if (targetRole && !["user", "admin"].includes(targetRole)) {
      return res.status(400).json({ success: false, message: "Invalid target audience." });
    }

    const announcement = await Announcement.create({
      subject: subject || "System Announcement",
      message,
      targetRole: targetRole || null,
      createdBy: req.user.id,
    });

    const query = targetRole ? { role: targetRole } : {};
    const recipients = await User.find(query).select("_id email displayName username role");

    const { getIO } = require("../utils/socket");
    try {
      const io = getIO();
      const payload = {
        _id: announcement._id,
        subject: subject || "System Announcement",
        message,
        timestamp: announcement.createdAt,
        targetRole: targetRole || null,
      };

      if (!targetRole) {
        io.emit("announcement", payload);
      } else {
        recipients.forEach((user) => {
          io.to(`user:${user._id}`).emit("announcement", payload);
        });
      }
    } catch {}

    let emailsSent = 0, emailsFailed = 0;
    if (sendEmail) {
      for (const user of recipients) {
        if (!user.email) continue;
        try {
          await sendMail({
            to:      user.email,
            subject: subject || "VaultFS Announcement",
            html: `
              <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#0f0f13;border-radius:12px;border:1px solid #2a2a3d;color:#e2e2e8;">
                <h2 style="color:#a78bfa;">${subject || "Announcement"}</h2>
                <p>Hi <strong>${user.displayName || user.username}</strong>,</p>
                <div style="background:#1a1a27;border-radius:8px;padding:16px;margin:16px 0;">
                  <p style="margin:0;">${message}</p>
                </div>
                <p style="color:#555;font-size:12px;">— VaultFS Admin</p>
              </div>
            `,
          });
          emailsSent++;
        } catch { emailsFailed++; }
      }
    }

    res.json({
      success: true,
      message: `Announcement sent${sendEmail ? `, ${emailsSent} emails delivered${emailsFailed ? `, ${emailsFailed} failed` : ""}` : ""}.`,
      announcement,
      stats: { targetedUsers: recipients.length, emailsSent, emailsFailed },
    });
  } catch (err) { next(err); }
};

// GET /api/admin/announcements
const getAnnouncements = async (req, res, next) => {
  try {
    const query = { isActive: true };
    if (req.user?.role !== "admin") {
      query.$or = [
        { targetRole: null },
        { targetRole: req.user?.role || "user" },
      ];
    }
    const announcements = await Announcement.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "username displayName email role");
    res.json({ success: true, announcements });
  } catch (err) { next(err); }
};

// DELETE /api/admin/announcements/:id
const removeAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!announcement) {
      return res.status(404).json({ success: false, message: "Announcement not found." });
    }
    const { getIO } = require("../utils/socket");
    try { getIO().emit("announcement_removed", { _id: announcement._id.toString() }); } catch {}
    res.json({ success: true, message: "Announcement removed." });
  } catch (err) { next(err); }
};

// ═══════════════════════════════
//  CUSTOM BRANDING
// ═══════════════════════════════

// GET /api/admin/branding (also public: GET /api/branding)
const getBranding = async (req, res, next) => {
  try {
    let branding = await Branding.findOne();
    if (!branding) branding = await Branding.create({});
    res.json({ success: true, branding });
  } catch (err) { next(err); }
};

// PUT /api/admin/branding
const updateBranding = async (req, res, next) => {
  try {
    let branding = await Branding.findOne();
    if (!branding) branding = new Branding();

    const allowed = ["appName", "logoUrl", "faviconUrl", "primaryColor", "accentColor",
                     "tagline", "supportEmail", "footerText", "features", "limits",
                     "allowedMimeTypes", "maintenanceMode", "maintenanceMessage"];
    allowed.forEach((k) => {
      if (req.body[k] !== undefined) branding[k] = req.body[k];
    });
    branding.updatedBy = req.user.id;
    await branding.save();

    res.json({ success: true, branding, message: "Branding settings updated." });
  } catch (err) { next(err); }
};

// ═══════════════════════════════
//  FULL-TEXT FILE SEARCH (Admin)
// ═══════════════════════════════

// GET /api/admin/files/search?q=...
const adminFullTextSearch = async (req, res, next) => {
  try {
    const { q, page = 1, limit = 30 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Search query must be at least 2 characters." });
    }

    let files, total;
    try {
      total = await File.countDocuments({ $text: { $search: q }, isDeleted: false });
      files = await File.find({ $text: { $search: q }, isDeleted: false })
        .sort({ score: { $meta: "textScore" } })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("owner", "username email displayName");
    } catch {
      const regex = new RegExp(q, "i");
      const query = {
        isDeleted: false,
        $or: [{ originalName: regex }, { description: regex }, { tags: { $elemMatch: regex } }],
      };
      total = await File.countDocuments(query);
      files = await File.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("owner", "username email displayName");
    }

    res.json({
      success: true,
      files,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════
//  BULK TAG EDITOR (Users)
// ═══════════════════════════════

// POST /api/files/bulk-tags
const bulkUpdateTags = async (req, res, next) => {
  try {
    const { fileIds, addTags = [], removeTags = [] } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ success: false, message: "fileIds array is required." });
    }
    if (addTags.length === 0 && removeTags.length === 0) {
      return res.status(400).json({ success: false, message: "At least one addTags or removeTags is required." });
    }

    const updateOps = {};
    if (addTags.length)    updateOps.$addToSet = { tags: { $each: addTags.map((t) => t.trim()).filter(Boolean) } };
    if (removeTags.length) updateOps.$pull     = { tags: { $in: removeTags } };

    const result = await File.updateMany(
      { _id: { $in: fileIds }, owner: req.user.id, isDeleted: false },
      updateOps,
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
      message: `Tags updated on ${result.modifiedCount} file(s).`,
    });
  } catch (err) { next(err); }
};

// ═══════════════════════════════
//  SYSTEM ACTIVITY LOG
// ═══════════════════════════════

// GET /api/admin/activities
const getActivities = async (req, res, next) => {
  try {
    const {
      page     = 1,
      limit    = 50,
      userId,
      action,
      dateFrom,
      dateTo,
      search,
    } = req.query;

    const query = {};
    if (userId)  query.user   = userId;
    if (action)  query.action = action;
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo)   query.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999));
    }
    if (search) {
      query.$or = [
        { ip: { $regex: search, $options: "i" } },
        { "details.filename": { $regex: search, $options: "i" } },
        { "details.originalName": { $regex: search, $options: "i" } },
      ];
    }

    const total = await Activity.countDocuments(query);
    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("user", "username displayName email avatarUrl role");

    res.json({
      success: true,
      activities,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit), limit: parseInt(limit) },
    });
  } catch (err) { next(err); }
};

// GET /api/admin/activities/stats
const getActivityStats = async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [byAction, byDay, topUsers] = await Promise.all([
      Activity.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Activity.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        }},
        { $sort: { _id: 1 } },
      ]),
      Activity.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: "$user", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { $project: { count: 1, "user.username": 1, "user.email": 1, "user.displayName": 1 } },
      ]),
    ]);
    res.json({ success: true, byAction, byDay, topUsers });
  } catch (err) { next(err); }
};

// GET /api/admin/users/:id/activities
const getUserActivities = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const query = { user: req.params.id };
    const total = await Activity.countDocuments(query);
    const activities = await Activity.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json({ success: true, activities, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
};

// ═══════════════════════════════
//  EXPORTS
// ═══════════════════════════════
module.exports = {
  getUsers, getUser, updateUser, deleteUser, createUser, exportUsers,
  banUser, unbanUser, forcePasswordReset, impersonateUser,
  getAllFiles, adminDeleteFile, getStorageHogs, getOrphanedFiles,
  cleanupOrphanedFiles, getDuplicateFiles,
  getSystemStats,
  broadcastAnnouncement, getAnnouncements, removeAnnouncement,
  getBranding, updateBranding,
  adminFullTextSearch,
  bulkUpdateTags,
  getActivities, getActivityStats, getUserActivities,
};