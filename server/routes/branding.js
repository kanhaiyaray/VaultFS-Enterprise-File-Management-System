/**
 * server/routes/branding.js
 * Mount with: app.use("/api/branding", require("./routes/branding"));
 *
 * Public — no auth needed. Returns safe subset of Branding document.
 */
const express  = require("express");
const Branding = require("../models/Branding");

const router = express.Router();

// GET /api/branding
router.get("/", async (req, res) => {
  try {
    let b = await Branding.findOne();
    if (!b) b = await Branding.create({});

    // Disable caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    res.json({
      success: true,
      branding: {
        appName:            b.appName || "VaultFS",
        logoUrl:            b.logoUrl || null,
        faviconUrl:         b.faviconUrl || null,
        primaryColor:       b.primaryColor || "#7c3aed",
        accentColor:        b.accentColor || "#06b6d4",
        tagline:            b.tagline || "Secure File Management",
        footerText:         b.footerText || null,
        supportEmail:       b.supportEmail || null,
        features:           b.features || {
          urlImport: true,
          publicGallery: true,
          twoFactor: true,
          teamCollaboration: true,
          fileRequests: true,
          officePreview: true,
          registration: true,
        },
        maintenanceMode:    b.maintenanceMode || false,
        maintenanceMessage: b.maintenanceMessage || "",
      },
    });
  } catch (err) {
    console.error("[branding] Error:", err);
    res.status(500).json({ success: false, message: "Failed to load branding." });
  }
});

module.exports = router;