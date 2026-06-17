const Webhook = require("../models/Webhook");
const crypto  = require("crypto");
const dns = require("dns").promises;
const { isIPv4, isIPv6 } = require("net");

// ── SSRF protection helpers (shared with fileController) ─────────────────────
function isPrivateIP(addr) {
  if (isIPv4(addr)) {
    const parts = addr.split(".").map(Number);
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 127) return true;
    if (addr === "0.0.0.0") return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    return false;
  }
  if (isIPv6(addr)) {
    if (addr === "::1" || addr === "::") return true;
    if (addr.startsWith("fe80:") || addr.startsWith("fc00:") || addr.startsWith("fd00:")) return true;
    return false;
  }
  return false;
}

async function isPublicUrl(urlString) {
  const url = new URL(urlString);
  if (!["http:", "https:"].includes(url.protocol)) return false;

  const hostname = url.hostname;
  let addresses;
  try {
    addresses = await dns.resolve(hostname);
  } catch {
    return false;
  }
  for (const addr of addresses) {
    if (isPrivateIP(addr)) return false;
  }
  return true;
}
// ──────────────────────────────────────────────────────────────────────────────

// ── CRUD endpoints ────────────────────────────────────────────────────────────
const getWebhooks = async (req, res, next) => {
  try {
    const webhooks = await Webhook.find({ owner: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, webhooks });
  } catch (err) { next(err); }
};

const createWebhook = async (req, res, next) => {
  try {
    const { name, url, secret, events } = req.body;
    if (!name || !url) {
      return res.status(400).json({ success: false, message: "Name and URL are required." });
    }
    try { new URL(url); } catch {
      return res.status(400).json({ success: false, message: "Invalid webhook URL." });
    }

    const count = await Webhook.countDocuments({ owner: req.user.id });
    if (count >= 10) {
      return res.status(400).json({ success: false, message: "Maximum 10 webhooks per account." });
    }

    const webhook = await Webhook.create({
      owner:  req.user.id,
      name:   name.trim(),
      url:    url.trim(),
      secret: secret?.trim() || null,
      events: Array.isArray(events) && events.length ? events : ["file.uploaded"],
    });

    res.status(201).json({ success: true, webhook, message: "Webhook created." });
  } catch (err) { next(err); }
};

const updateWebhook = async (req, res, next) => {
  try {
    const allowed = ["name", "url", "secret", "events", "isActive"];
    const updates = {};
    allowed.forEach((k) => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const webhook = await Webhook.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      updates,
      { new: true },
    );
    if (!webhook) return res.status(404).json({ success: false, message: "Webhook not found." });
    res.json({ success: true, webhook, message: "Webhook updated." });
  } catch (err) { next(err); }
};

const deleteWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!webhook) return res.status(404).json({ success: false, message: "Webhook not found." });
    res.json({ success: true, message: "Webhook deleted." });
  } catch (err) { next(err); }
};

const testWebhook = async (req, res, next) => {
  try {
    const webhook = await Webhook.findOne({ _id: req.params.id, owner: req.user.id });
    if (!webhook) return res.status(404).json({ success: false, message: "Webhook not found." });

    const status = await dispatchWebhook(webhook, "webhook.test", {
      message:   "This is a VaultFS test event.",
      timestamp: new Date().toISOString(),
    });

    const ok = status >= 200 && status < 300;
    res.json({
      success:    ok,
      statusCode: status,
      message:    ok ? `Webhook delivered (HTTP ${status}).` : `Delivery failed (HTTP ${status}).`,
    });
  } catch (err) { next(err); }
};

// ── dispatchWebhook (internal) with SSRF protection ──────────────────────────
async function dispatchWebhook(webhook, event, payload) {
  // ─── SSRF & protocol validation ───
  // 1) Enforce HTTPS (can be relaxed for local dev via env)
  const allowHttp = process.env.WEBHOOK_ALLOW_HTTP === "true";
  const url = new URL(webhook.url);
  if (!allowHttp && url.protocol !== "https:") {
    // Mark as failure without attempting delivery
    await Webhook.findByIdAndUpdate(webhook._id, {
      lastFiredAt:    new Date(),
      lastStatusCode: 0,
      $inc: { totalFired: 1, failureCount: 1 },
    });
    return 0;
  }

  // 2) Validate that the URL resolves to a public IP
  if (!await isPublicUrl(webhook.url)) {
    await Webhook.findByIdAndUpdate(webhook._id, {
      lastFiredAt:    new Date(),
      lastStatusCode: 0,
      $inc: { totalFired: 1, failureCount: 1 },
    });
    return 0;
  }
  // ──────────────────────────────────

  const body = JSON.stringify({
    event,
    payload,
    webhookId: webhook._id,
    timestamp: new Date().toISOString(),
  });

  const signature = webhook.secret
    ? "sha256=" + crypto.createHmac("sha256", webhook.secret).update(body).digest("hex")
    : null;

  try {
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 10_000);

    const response = await fetch(webhook.url, {
      method:  "POST",
      signal:  controller.signal,
      headers: {
        "Content-Type":         "application/json",
        "User-Agent":           "VaultFS-Webhook/1.0",
        "X-VaultFS-Event":      event,
        ...(signature ? { "X-VaultFS-Signature": signature } : {}),
      },
      body,
    });
    clearTimeout(timeoutId);

    await Webhook.findByIdAndUpdate(webhook._id, {
      lastFiredAt:    new Date(),
      lastStatusCode: response.status,
      $inc: {
        totalFired:   1,
        failureCount: response.ok ? 0 : 1,
      },
    });

    return response.status;
  } catch (err) {
    await Webhook.findByIdAndUpdate(webhook._id, {
      lastFiredAt:    new Date(),
      lastStatusCode: 0,
      $inc: { totalFired: 1, failureCount: 1 },
    });
    return 0;
  }
}

/**
 * triggerWebhook — call from fileController after file events
 *
 * @param {string}   userId  — the file owner's ID
 * @param {string}   event   — one of the enum values in the Webhook model
 * @param {object}   payload — event-specific data
 */
async function triggerWebhook(userId, event, payload) {
  try {
    const webhooks = await Webhook.find({ owner: userId, isActive: true, events: event });
    if (!webhooks.length) return;
    await Promise.allSettled(webhooks.map((wh) => dispatchWebhook(wh, event, payload)));
  } catch {
    // Non‑fatal — never break the main request
  }
}

module.exports = {
  getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook,
  triggerWebhook,
  dispatchWebhook,   // exported for testing
};