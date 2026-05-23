/**
 * routes/team.js
 * Team collaboration endpoints for VaultFS.
 */
const express  = require("express");
const crypto   = require("crypto");
const { protect } = require("../middleware/auth");
const User     = require("../models/User");
const mongoose = require("mongoose");

// ── Simple Team schema (inline — no separate model file needed) ───────────────
const teamSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  owner:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  inviteCode: { type: String, unique: true },
  members: [{
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    role:        { type: String, enum: ["owner","admin","editor","viewer"], default: "viewer" },
    username:    String,
    displayName: String,
    email:       String,
    joinedAt:    { type: Date, default: Date.now },
  }],
}, { timestamps: true });

const Team = mongoose.models.Team || mongoose.model("Team", teamSchema);

const router = express.Router();
router.use(protect);

// GET /api/team — get user's team
router.get("/", async (req, res, next) => {
  try {
    const team = await Team.findOne({
      $or: [
        { owner: req.user.id },
        { "members.userId": req.user.id },
      ],
    });
    return res.json({ success: true, team: team || null });
  } catch (err) { next(err); }
});

// POST /api/team — create team
router.post("/", async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ success: false, message: "Team name is required." });

    const existing = await Team.findOne({
      $or: [
        { owner: req.user.id },
        { "members.userId": req.user.id },
      ],
    });
    if (existing) return res.status(409).json({ success: false, message: "You are already part of a team." });

    const user = await User.findById(req.user.id);
    const team = await Team.create({
      name:       name.trim(),
      owner:      req.user.id,
      inviteCode: crypto.randomBytes(12).toString("hex"),
      members: [{
        userId:      req.user.id,
        role:        "owner",
        username:    user.username,
        displayName: user.displayName || user.username,
        email:       user.email,
      }],
    });
    return res.status(201).json({ success: true, team });
  } catch (err) { next(err); }
});

// POST /api/team/:id/invite — invite member
router.post("/:id/invite", async (req, res, next) => {
  try {
    const { email, role = "viewer" } = req.body;
    const team = await Team.findOne({ _id: req.params.id, owner: req.user.id });
    if (!team) return res.status(404).json({ success: false, message: "Team not found." });

    const invitee = await User.findOne({ email: email.toLowerCase() });
    if (!invitee) return res.status(404).json({ success: false, message: "No user found with that email." });

    const already = team.members.find((m) => m.userId?.toString() === invitee._id.toString());
    if (already) return res.status(409).json({ success: false, message: "User is already a member." });

    team.members.push({
      userId:      invitee._id,
      role,
      username:    invitee.username,
      displayName: invitee.displayName || invitee.username,
      email:       invitee.email,
    });
    await team.save();
    return res.json({ success: true, team, message: `${invitee.displayName || invitee.username} added to team.` });
  } catch (err) { next(err); }
});

// PUT /api/team/:id/members/:memberId — change role
router.put("/:id/members/:memberId", async (req, res, next) => {
  try {
    const { role } = req.body;
    const team = await Team.findOne({ _id: req.params.id, owner: req.user.id });
    if (!team) return res.status(404).json({ success: false, message: "Team not found." });

    const member = team.members.id(req.params.memberId);
    if (!member) return res.status(404).json({ success: false, message: "Member not found." });
    member.role = role;
    await team.save();
    return res.json({ success: true, team });
  } catch (err) { next(err); }
});

// DELETE /api/team/:id/members/:memberId — remove member
router.delete("/:id/members/:memberId", async (req, res, next) => {
  try {
    const team = await Team.findOne({ _id: req.params.id, owner: req.user.id });
    if (!team) return res.status(404).json({ success: false, message: "Team not found." });
    team.members = team.members.filter((m) => m._id.toString() !== req.params.memberId);
    await team.save();
    return res.json({ success: true, team });
  } catch (err) { next(err); }
});

// DELETE /api/team/:id — delete team
router.delete("/:id", async (req, res, next) => {
  try {
    await Team.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    return res.json({ success: true, message: "Team deleted." });
  } catch (err) { next(err); }
});

module.exports = router;
