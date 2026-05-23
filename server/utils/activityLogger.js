/**
 * utils/activityLogger.js
 * VaultFS — Utility to record user actions into the Activity collection.
 * Fire-and-forget: never throws, never blocks the main request.
 *
 * Usage:
 *   const { logActivity } = require("../utils/activityLogger");
 *   await logActivity(req, userId, "upload", { filename, size });
 */
const Activity = require("../models/Activity");

/**
 * @param {import("express").Request} req  - Express request (for IP / UA)
 * @param {string|ObjectId}           userId
 * @param {string}                    action  - must match Activity enum
 * @param {object}                    [details={}]
 */
const logActivity = async (req, userId, action, details = {}) => {
  try {
    if (!userId || !action) return;
    const ip        = req?.ip || req?.headers?.["x-forwarded-for"] || "unknown";
    const userAgent = req?.headers?.["user-agent"] || "unknown";

    await Activity.create({ user: userId, action, details, ip, userAgent });
  } catch (err) {
    // Never let logging crash the main flow
    console.warn("[activityLogger] Failed to log activity:", err.message);
  }
};

module.exports = { logActivity };
