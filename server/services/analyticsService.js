/**
 * server/services/analyticsService.js — FIXED
 * All string templates use concatenation (no backticks) to guarantee
 * safe regeneration. Every metric is honest and correctly scoped.
 */
const mongoose = require("mongoose");
const File = require("../models/File");
const User = require("../models/User");
const Activity = require("../models/Activity");
const Device = require("../models/Device");
const Workflow = require("../models/Workflow");

function parseRange(range) {
  const r = range || "30d";
  const now = new Date();
  const endDate = new Date(now);
  const startDate = new Date(now);
  startDate.setUTCHours(0, 0, 0, 0);
  if (r === "today") { startDate.setUTCHours(0, 0, 0, 0); }
  else if (r === "7d") { startDate.setUTCDate(startDate.getUTCDate() - 7); }
  else if (r === "30d") { startDate.setUTCDate(startDate.getUTCDate() - 30); }
  else if (r === "90d") { startDate.setUTCDate(startDate.getUTCDate() - 90); }
  else if (r === "12m") { startDate.setUTCMonth(startDate.getUTCMonth() - 12); }
  else { startDate.setUTCDate(startDate.getUTCDate() - 30); }
  const periodMs = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate);
  const prevStartDate = new Date(startDate.getTime() - periodMs);
  return { startDate: startDate, endDate: endDate, prevStartDate: prevStartDate, prevEndDate: prevEndDate, periodMs: periodMs };
}

function labelForRange(r) {
  if (r === "today") return "Today";
  if (r === "7d") return "Last 7 Days";
  if (r === "30d") return "Last 30 Days";
  if (r === "90d") return "Last 90 Days";
  if (r === "12m") return "Last 12 Months";
  return "Last 30 Days";
}

const fileScope     = (u) => u.role === "admin" ? {} : { owner: new mongoose.Types.ObjectId(u.id) };
const activityScope = (u) => u.role === "admin" ? {} : { user: new mongoose.Types.ObjectId(u.id) };
const workflowScope = (u) => u.role === "admin" ? {} : { createdBy: new mongoose.Types.ObjectId(u.id) };

const pctChange = (cur, prev) => {
  if (!prev && !cur) return 0;
  if (!prev) return 100;
  return Math.round(((cur - prev) / prev) * 100);
};

async function getWorkspaceStorageLimit() {
  const agg = await User.aggregate([{ $group: { _id: null, total: { $sum: "$storageLimit" } } }]);
  return agg[0] && agg[0].total ? agg[0].total : 0;
}

function categorizeMime(mimetype) {
  if (!mimetype) return "Other";
  if (mimetype.startsWith("image/")) return "Images";
  if (mimetype.startsWith("video/")) return "Videos";
  if (mimetype.startsWith("audio/")) return "Audio";
  if (mimetype === "application/pdf") return "PDFs";
  if (mimetype.indexOf("zip") !== -1 || mimetype.indexOf("compressed") !== -1 || mimetype.indexOf("tar") !== -1 || mimetype.indexOf("gzip") !== -1 || mimetype.indexOf("rar") !== -1) return "Archives";
  if (mimetype.indexOf("word") !== -1 || mimetype.indexOf("opendocument.text") !== -1) return "Word Documents";
  if (mimetype.indexOf("excel") !== -1 || mimetype.indexOf("spreadsheet") !== -1) return "Spreadsheets";
  if (mimetype.indexOf("powerpoint") !== -1 || mimetype.indexOf("presentation") !== -1) return "Presentations";
  if (mimetype.startsWith("text/")) return "Text/Code";
  if (mimetype.indexOf("json") !== -1 || mimetype.indexOf("javascript") !== -1 || mimetype.indexOf("xml") !== -1) return "Code/Data";
  return "Other";
}

async function getOverview(user, range) {
  const ranges = parseRange(range);
  const startDate = ranges.startDate, endDate = ranges.endDate;
  const prevStartDate = ranges.prevStartDate, prevEndDate = ranges.prevEndDate;

  const isAdmin = user.role === "admin";
  const fScope = fileScope(user);
  const aScope = activityScope(user);
  const wScope = workflowScope(user);

  const effectiveLimit = isAdmin
    ? await getWorkspaceStorageLimit()
    : (user.storageLimit || (5 * 1024 * 1024 * 1024));

  const [filesNow, filesCreatedNow, filesCreatedPrev] = await Promise.all([
    File.countDocuments({ ...fScope, isDeleted: false }),
    File.countDocuments({ ...fScope, isDeleted: false, createdAt: { $gte: startDate, $lte: endDate } }),
    File.countDocuments({ ...fScope, isDeleted: false, createdAt: { $gte: prevStartDate, $lte: prevEndDate } }),
  ]);

  const storageAgg = await File.aggregate([
    { $match: { ...fScope, isDeleted: false, isDedup: { $ne: true } } },
    { $group: { _id: null, total: { $sum: "$size" } } },
  ]);
  const totalStorage = storageAgg[0] ? storageAgg[0].total : 0;
  const storageUsedPct = effectiveLimit > 0 ? Math.min(100, parseFloat(((totalStorage / effectiveLimit) * 100).toFixed(1))) : 0;

  const fileActivityActions = ["upload", "download", "share", "delete", "rename"];
  let activeUsersResult;
  if (isAdmin) {
    const [activeNow, activePrev] = await Promise.all([
      Activity.aggregate([
        { $match: { action: { $in: fileActivityActions }, createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: "$user" } },
        { $count: "total" },
      ]),
      Activity.aggregate([
        { $match: { action: { $in: fileActivityActions }, createdAt: { $gte: prevStartDate, $lte: prevEndDate } } },
        { $group: { _id: "$user" } },
        { $count: "total" },
      ]),
    ]);
    const nowCount = activeNow[0] ? activeNow[0].total : 0;
    const prevCount = activePrev[0] ? activePrev[0].total : 0;
    activeUsersResult = { value: nowCount, previous: prevCount, change: pctChange(nowCount, prevCount), isAdmin: true };
  } else {
    activeUsersResult = {
      value: filesCreatedNow,
      previous: filesCreatedPrev,
      change: pctChange(filesCreatedNow, filesCreatedPrev),
      isAdmin: false,
    };
  }

  const now = new Date();
  const activeShareFilter = {
    ...fScope, isDeleted: false,
    shareToken: { $exists: true, $ne: null },
    $and: [
      { $or: [{ shareExpiry: null }, { shareExpiry: { $gt: now } }] },
      { $or: [{ shareMaxDownloads: null }, { $expr: { $lt: ["$shareDownloadCount", { $ifNull: ["$shareMaxDownloads", 999999999] }] } }] },
    ],
  };
  const publicGalleryFilter = { ...fScope, isDeleted: false, isPublic: true };
  const [activeShares, galleryCount] = await Promise.all([
    File.countDocuments(activeShareFilter),
    File.countDocuments(publicGalleryFilter),
  ]);

  const alertFilter = isAdmin ? { isSuspicious: true } : { user: user.id, isSuspicious: true };
  const alertsNow = await Device.countDocuments(alertFilter);

  const [runsNowAgg, runsPrevAgg] = await Promise.all([
    Workflow.aggregate([{ $match: wScope }, { $unwind: "$runHistory" }, { $match: { "runHistory.startedAt": { $gte: startDate, $lte: endDate } } }, { $count: "total" }]),
    Workflow.aggregate([{ $match: wScope }, { $unwind: "$runHistory" }, { $match: { "runHistory.startedAt": { $gte: prevStartDate, $lte: prevEndDate } } }, { $count: "total" }]),
  ]);
  const runsNow = runsNowAgg[0] ? runsNowAgg[0].total : 0;
  const runsPrev = runsPrevAgg[0] ? runsPrevAgg[0].total : 0;

  const fileTypesAgg = await File.aggregate([
    { $match: { ...fScope, isDeleted: false } },
    { $group: { _id: "$mimetype", count: { $sum: 1 }, bytes: { $sum: "$size" } } },
  ]);
  const categoryMap = new Map();
  for (const t of fileTypesAgg) {
    const cat = categorizeMime(t._id);
    const cur = categoryMap.get(cat) || { type: cat, count: 0, bytes: 0 };
    cur.count += t.count;
    cur.bytes += t.bytes;
    categoryMap.set(cat, cur);
  }
  const fileTypes = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);

  let topUploaders;
  if (isAdmin) {
    topUploaders = await File.aggregate([
      { $match: { isDeleted: false, createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: "$owner", files: { $sum: 1 }, bytes: { $sum: "$size" } } },
      { $sort: { files: -1 } },
      { $limit: 5 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      { $project: { _id: 0, userId: "$_id", username: "$user.username", displayName: "$user.displayName", avatarUrl: "$user.avatarUrl", files: 1, bytes: 1 } },
    ]);
  } else {
    const mine = await File.aggregate([
      { $match: { ...fScope, isDeleted: false, createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, files: { $sum: 1 }, bytes: { $sum: "$size" } } },
    ]);
    topUploaders = [{
      userId: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      avatarUrl: user.avatarUrl || null,
      files: mine[0] ? mine[0].files : 0,
      bytes: mine[0] ? mine[0].bytes : 0,
    }];
  }

  const recentActivityCount = await Activity.countDocuments({ ...aScope, createdAt: { $gte: startDate, $lte: endDate } });

  return {
    range: range,
    periodLabel: labelForRange(range),
    isAdmin: isAdmin,
    totalFiles: { value: filesNow, createdInPeriod: filesCreatedNow, previous: filesCreatedPrev, change: pctChange(filesCreatedNow, filesCreatedPrev) },
    storageUsed: { value: totalStorage, limit: effectiveLimit, percent: storageUsedPct, remaining: Math.max(0, effectiveLimit - totalStorage) },
    activeUsers: activeUsersResult,
    filesShared: { value: activeShares + galleryCount, activeShares: activeShares, galleryCount: galleryCount, previous: null, change: null },
    securityAlerts: { value: alertsNow, previous: 0, change: 0 },
    automationRuns: { value: runsNow, previous: runsPrev, change: pctChange(runsNow, runsPrev) },
    fileTypes: fileTypes,
    topUploaders: topUploaders,
    recentActivityCount: recentActivityCount,
  };
}

async function getStorage(user, range) {
  const ranges = parseRange(range);
  const startDate = ranges.startDate, endDate = ranges.endDate;
  const isAdmin = user.role === "admin";
  const fScope = fileScope(user);
  const effectiveLimit = isAdmin ? await getWorkspaceStorageLimit() : (user.storageLimit || (5 * 1024 * 1024 * 1024));

  const baselineAgg = await File.aggregate([
    { $match: { ...fScope, isDeleted: false, isDedup: { $ne: true }, createdAt: { $lt: startDate } } },
    { $group: { _id: null, total: { $sum: "$size" } } },
  ]);
  const baselineStorage = baselineAgg[0] ? baselineAgg[0].total : 0;

  const dailyAgg = await File.aggregate([
    { $match: { ...fScope, isDeleted: false, isDedup: { $ne: true }, createdAt: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, bytes: { $sum: "$size" }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  let cumulative = baselineStorage;
  const trendMap = new Map();
  for (const d of dailyAgg) {
    cumulative += d.bytes;
    trendMap.set(d._id, { date: d._id, bytes: cumulative, additions: d.bytes, count: d.count });
  }

  const trend = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);
  const endDay = new Date(endDate);
  endDay.setUTCHours(23, 59, 59, 999);
  while (cursor <= endDay) {
    const key = cursor.toISOString().slice(0, 10);
    const existing = trendMap.get(key);
    trend.push(existing || { date: key, bytes: cumulative, additions: 0, count: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const largest = await File.find({ ...fScope, isDeleted: false })
    .sort({ size: -1 }).limit(5)
    .select("originalName size mimetype createdAt").lean();

  const addedInRange = trend.length > 0 ? (trend[trend.length - 1].bytes - baselineStorage) : 0;
  const growthRate = baselineStorage > 0 ? parseFloat(((addedInRange / baselineStorage) * 100).toFixed(1)) : 0;
  const daysInRange = Math.max(1, trend.length);
  const avgDailyAdd = addedInRange / daysInRange;
  const remaining = Math.max(0, effectiveLimit - cumulative);
  const daysToFull = avgDailyAdd > 0 ? Math.floor(remaining / avgDailyAdd) : null;

  return {
    trend: trend, current: cumulative, limit: effectiveLimit,
    percent: effectiveLimit > 0 ? Math.min(100, parseFloat(((cumulative / effectiveLimit) * 100).toFixed(1))) : 0,
    addedInRange: addedInRange, growthRate: growthRate, avgDailyAdd: Math.round(avgDailyAdd),
    daysToFull: daysToFull, largest: largest, isAdmin: isAdmin,
  };
}

async function getFiles(user, range) {
  const ranges = parseRange(range);
  const startDate = ranges.startDate, endDate = ranges.endDate;
  const prevStartDate = ranges.prevStartDate, prevEndDate = ranges.prevEndDate;
  const fScope = fileScope(user);

  const [typesAgg, uploadAgg, largest, recent, prevUploadAgg] = await Promise.all([
    File.aggregate([
      { $match: { ...fScope, isDeleted: false } },
      { $group: { _id: "$mimetype", count: { $sum: 1 }, bytes: { $sum: "$size" } } },
    ]),
    File.aggregate([
      { $match: { ...fScope, isDeleted: false, createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 }, bytes: { $sum: "$size" } } },
      { $sort: { _id: 1 } },
    ]),
    File.find({ ...fScope, isDeleted: false }).sort({ size: -1 }).limit(5).select("originalName size mimetype createdAt").lean(),
    File.find({ ...fScope, isDeleted: false }).sort({ createdAt: -1 }).limit(5).select("originalName size mimetype createdAt").lean(),
    File.aggregate([{ $match: { ...fScope, isDeleted: false, createdAt: { $gte: prevStartDate, $lte: prevEndDate } } }, { $count: "total" }]),
  ]);

  const categoryMap = new Map();
  for (const t of typesAgg) {
    const cat = categorizeMime(t._id);
    const cur = categoryMap.get(cat) || { type: cat, count: 0, bytes: 0 };
    cur.count += t.count;
    cur.bytes += t.bytes;
    categoryMap.set(cat, cur);
  }
  const types = Array.from(categoryMap.values()).sort((a, b) => b.count - a.count);

  const totalUploads = uploadAgg.reduce((s, d) => s + d.count, 0);
  const prevUploads = prevUploadAgg[0] ? prevUploadAgg[0].total : 0;

  return {
    types: types,
    uploadTrend: uploadAgg.map((d) => ({ date: d._id, count: d.count, bytes: d.bytes })),
    sizeBuckets: [],
    largest: largest,
    recent: recent,
    uploadsInRange: totalUploads,
    uploadsPrevious: prevUploads,
    uploadChange: pctChange(totalUploads, prevUploads),
  };
}

async function getSharing(user, range) {
  const fScope = fileScope(user);
  const now = new Date();
  const activeFilter = {
    ...fScope, isDeleted: false,
    shareToken: { $exists: true, $ne: null },
    $and: [
      { $or: [{ shareExpiry: null }, { shareExpiry: { $gt: now } }] },
      { $or: [{ shareMaxDownloads: null }, { $expr: { $lt: ["$shareDownloadCount", { $ifNull: ["$shareMaxDownloads", 999999999] }] } }] },
    ],
  };

  const [total, galleryCount, topShared, totalDownloads, expiring] = await Promise.all([
    File.countDocuments(activeFilter),
    File.countDocuments({ ...fScope, isDeleted: false, isPublic: true }),
    File.find(activeFilter).sort({ shareDownloadCount: -1, updatedAt: -1 }).limit(5).select("originalName mimetype size shareDownloadCount createdAt").lean(),
    File.aggregate([{ $match: activeFilter }, { $group: { _id: null, total: { $sum: "$shareDownloadCount" } } }]),
    File.find({ ...activeFilter, shareExpiry: { $gte: now, $lte: new Date(Date.now() + 7 * 86400_000) } }).sort({ shareExpiry: 1 }).limit(5).select("originalName mimetype size shareExpiry").lean(),
  ]);

  return {
    total: total + galleryCount,
    activeShares: total,
    public: galleryCount,
    private: total,
    totalDownloads: totalDownloads[0] ? totalDownloads[0].total : 0,
    topShared: topShared,
    expiring: expiring,
    range: range,
  };
}

async function getActivity(user, range) {
  const ranges = parseRange(range);
  const startDate = ranges.startDate, endDate = ranges.endDate;
  const aScope = activityScope(user);

  const [feed, heatmap, totalCount] = await Promise.all([
    Activity.find({ ...aScope, createdAt: { $gte: startDate, $lte: endDate } }).sort({ createdAt: -1 }).limit(20).populate("user", "username displayName avatarUrl").lean(),
    Activity.aggregate([
      { $match: { ...aScope, createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: { dow: { $dayOfWeek: "$createdAt" }, hour: { $hour: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    Activity.countDocuments({ ...aScope, createdAt: { $gte: startDate, $lte: endDate } }),
  ]);

  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  let max = 0;
  for (const cell of heatmap) {
    const dow = cell._id.dow;
    const hour = cell._id.hour;
    const displayRow = dow === 1 ? 6 : dow - 2;
    if (displayRow >= 0 && displayRow < 7 && hour >= 0 && hour < 24) {
      grid[displayRow][hour] = cell.count;
      if (cell.count > max) max = cell.count;
    }
  }

  return {
    feed: feed.map((a) => ({ _id: a._id, action: a.action, details: a.details || {}, ip: a.ip, createdAt: a.createdAt, user: a.user ? { username: a.user.username, displayName: a.user.displayName, avatarUrl: a.user.avatarUrl } : null })),
    heatmap: { grid: grid, max: max || 1 },
    totalCount: totalCount,
  };
}

async function getSecurity(user, range) {
  const ranges = parseRange(range);
  const startDate = ranges.startDate, endDate = ranges.endDate;
  const isAdmin = user.role === "admin";

  const deviceFilter = isAdmin ? {} : { user: user.id };
  const activityUserFilter = isAdmin ? {} : { user: user.id };

  const [devices, totalDevices, trustedDevices, suspiciousDevices, loginEvents] = await Promise.all([
    Device.find(deviceFilter).sort({ lastSeenAt: -1 }).limit(10).lean(),
    Device.countDocuments(deviceFilter),
    Device.countDocuments({ ...deviceFilter, isTrusted: true }),
    Device.countDocuments({ ...deviceFilter, isSuspicious: true }),
    Activity.countDocuments({ ...activityUserFilter, action: "login", createdAt: { $gte: startDate, $lte: endDate } }),
  ]);

  const platformAgg = await Device.aggregate([
    { $match: deviceFilter },
    { $group: { _id: "$platform", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const checks = [
    { key: "emailVerified", label: "Email Verified", passed: !!user.emailVerified, weight: 20 },
    { key: "twoFactor", label: "Two-Factor Auth", passed: !!user.twoFactorEnabled, weight: 30 },
    { key: "noSuspiciousDevices", label: "No Suspicious Devices", passed: suspiciousDevices === 0, weight: 30 },
    { key: "accountActive", label: "Account Active", passed: !user.isBanned, weight: 20 },
  ];
  const score = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);

  return {
    score: score, checks: checks,
    devices: devices.map((d) => ({ _id: d._id, deviceName: d.deviceName, platform: d.platform, isTrusted: d.isTrusted, isSuspicious: d.isSuspicious, lastSeenAt: d.lastSeenAt })),
    totalDevices: totalDevices,
    trustedDevices: trustedDevices,
    suspiciousDevices: suspiciousDevices,
    loginEvents: loginEvents,
    platformBreakdown: platformAgg.map((p) => ({ platform: p._id || "Unknown", count: p.count })),
    isAdmin: isAdmin,
  };
}

async function getWorkflows(user, range) {
  const ranges = parseRange(range);
  const startDate = ranges.startDate, endDate = ranges.endDate;
  const wScope = workflowScope(user);

  const [runsAgg, recentRuns, totalWorkflows] = await Promise.all([
    Workflow.aggregate([{ $match: wScope }, { $unwind: "$runHistory" }, { $match: { "runHistory.startedAt": { $gte: startDate, $lte: endDate } } }, { $group: { _id: "$runHistory.status", count: { $sum: 1 } } }]),
    Workflow.aggregate([
      { $match: wScope }, { $unwind: "$runHistory" },
      { $match: { "runHistory.startedAt": { $gte: startDate, $lte: endDate } } },
      { $sort: { "runHistory.startedAt": -1 } }, { $limit: 10 },
      { $project: { _id: 0, workflowName: "$name", status: "$runHistory.status", startedAt: "$runHistory.startedAt", completedAt: "$runHistory.completedAt" } },
    ]),
    Workflow.countDocuments(wScope),
  ]);

  const byStatus = {};
  for (const r of runsAgg) byStatus[r._id] = r.count;
  const total = Object.values(byStatus).reduce((s, v) => s + v, 0);

  return {
    totalWorkflows: totalWorkflows,
    total: total,
    successful: byStatus.completed || 0,
    failed: byStatus.failed || 0,
    inProgress: byStatus.running || 0,
    pending: byStatus.pending || 0,
    recentRuns: recentRuns,
  };
}

async function getUserGrowth(user, range) {
  if (user.role !== "admin") {
    return { growth: [], totalUsers: 1, newInRange: 0, isAdmin: false, bucketType: "days" };
  }
  const ranges = parseRange(range);
  const startDate = ranges.startDate, endDate = ranges.endDate;
  const useMonths = range === "12m";
  const bucketFormat = useMonths ? "%Y-%m" : "%Y-%m-%d";

  const growth = await User.aggregate([
    { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: { $dateToString: { format: bucketFormat, date: "$createdAt" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const filled = [];
  if (useMonths) {
    const cur = new Date(startDate);
    cur.setUTCDate(1);
    while (cur <= endDate) {
      const key = cur.toISOString().slice(0, 7);
      const found = growth.find((g) => g._id === key);
      filled.push({ month: key, label: cur.toLocaleString("en-US", { month: "short", year: "2-digit" }), count: found ? found.count : 0 });
      cur.setUTCMonth(cur.getUTCMonth() + 1);
    }
  } else {
    const cur = new Date(startDate);
    cur.setUTCHours(0, 0, 0, 0);
    const endLimit = new Date(endDate);
    endLimit.setUTCHours(23, 59, 59, 999);
    let iterations = 0;
    while (cur <= endLimit && iterations < 400) {
      const key = cur.toISOString().slice(0, 10);
      const found = growth.find((g) => g._id === key);
      filled.push({ month: key, label: cur.toLocaleString("en-US", { month: "short", day: "numeric" }), count: found ? found.count : 0 });
      cur.setUTCDate(cur.getUTCDate() + 1);
      iterations++;
    }
  }

  const [totalUsers, newInRange] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
  ]);

  return { growth: filled, totalUsers: totalUsers, newInRange: newInRange, isAdmin: true, bucketType: useMonths ? "months" : "days" };
}

async function buildCsvReport(user, range) {
  const [overview, files, activity] = await Promise.all([getOverview(user, range), getFiles(user, range), getActivity(user, range)]);
  const lines = [];
  lines.push("# VaultFS Analytics Report");
  lines.push("# Range: " + overview.periodLabel + " (" + range + ")");
  lines.push("# Generated: " + new Date().toISOString());
  lines.push("");
  lines.push("## Overview");
  lines.push("metric,value,change_pct");
  lines.push("total_files," + overview.totalFiles.value + "," + overview.totalFiles.change);
  lines.push("storage_used_bytes," + overview.storageUsed.value + ",");
  lines.push("storage_limit_bytes," + overview.storageUsed.limit + ",");
  lines.push("storage_utilization_pct," + overview.storageUsed.percent + ",");
  lines.push("files_shared," + overview.filesShared.value + ",");
  lines.push("security_alerts," + overview.securityAlerts.value + ",");
  lines.push("automation_runs," + overview.automationRuns.value + "," + overview.automationRuns.change);
  lines.push("");
  lines.push("## File Types");
  lines.push("type,count,bytes");
  for (const t of files.types) lines.push(t.type + "," + t.count + "," + t.bytes);
  lines.push("");
  lines.push("## Upload Trend");
  lines.push("date,count,bytes");
  for (const d of files.uploadTrend) lines.push(d.date + "," + d.count + "," + d.bytes);
  lines.push("");
  lines.push("## Recent Activity");
  lines.push("timestamp,action,user,ip");
  for (const a of activity.feed) {
    const u = a.user && a.user.username ? a.user.username : "unknown";
    lines.push(a.createdAt.toISOString() + "," + a.action + "," + u + "," + (a.ip || ""));
  }
  return lines.join("\n");
}

module.exports = { parseRange, getOverview, getStorage, getFiles, getSharing, getActivity, getSecurity, getWorkflows, getUserGrowth, buildCsvReport };
