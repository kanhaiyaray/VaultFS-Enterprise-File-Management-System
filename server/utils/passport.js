/**
 * utils/passport.js
 * Configures Passport.js strategies for Google and GitHub OAuth.
 * Call require("./utils/passport") once in server/index.js before routes.
 */
const passport       = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const crypto         = require("crypto");
const User           = require("../models/User");

// ── Google OAuth ──────────────────────────────────────────────────────────────
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:  `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/google/callback`,
        scope:        ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email      = profile.emails?.[0]?.value?.toLowerCase();
          const googleId   = profile.id;
          const displayName = profile.displayName || profile.name?.givenName || "";
          const avatarUrl  = profile.photos?.[0]?.value;

          // Find existing user by googleId or email
          let user = await User.findOne({ $or: [{ googleId }, { email }] });

          if (user) {
            // Merge googleId if missing
            if (!user.googleId) { user.googleId = googleId; await user.save(); }
            return done(null, user);
          }

          // Create new user
          const username = email
            ? email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").slice(0, 25) +
              crypto.randomBytes(2).toString("hex")
            : `user_${crypto.randomBytes(4).toString("hex")}`;

          user = await User.create({
            username,
            email:              email || `${googleId}@google.oauth`,
            displayName,
            avatarUrl,
            googleId,
            emailVerified:      true,
            onboardingCompleted: false,
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn("[Passport] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set — Google OAuth disabled.");
}

// ── GitHub OAuth ──────────────────────────────────────────────────────────────
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID:     process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL:  `${process.env.SERVER_URL || "http://localhost:5000"}/api/auth/github/callback`,
        scope:        ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email     = profile.emails?.[0]?.value?.toLowerCase();
          const githubId  = profile.id.toString();
          const displayName = profile.displayName || profile.username || "";
          const avatarUrl  = profile.photos?.[0]?.value;

          let user = await User.findOne({ $or: [{ githubId }, ...(email ? [{ email }] : [])] });

          if (user) {
            if (!user.githubId) { user.githubId = githubId; await user.save(); }
            return done(null, user);
          }

          const username = (profile.username || `ghuser_${githubId}`)
            .replace(/[^a-zA-Z0-9_]/g, "")
            .slice(0, 25) + crypto.randomBytes(2).toString("hex");

          user = await User.create({
            username,
            email:              email || `${githubId}@github.oauth`,
            displayName,
            avatarUrl,
            githubId,
            emailVerified:      !!email,
            onboardingCompleted: false,
          });

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn("[Passport] GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not set — GitHub OAuth disabled.");
}

// ── Serialisation (not needed for JWT flow, but keeps passport happy) ─────────
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try { done(null, await User.findById(id)); }
  catch (err) { done(err); }
});

module.exports = passport;
