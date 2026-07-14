/**
 * utils/sendMail.js
 * VaultFS email sender using Resend API.
 * 
 * Usage:
 *   await sendMail({ to, subject, html })
 *   await sendMail({ to, subject, html, text })
 */
const { Resend } = require('resend');

let resend = null;

function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

// ── sendMail ──────────────────────────────────────────────────────────────────
async function sendMail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('❌ RESEND_API_KEY not set – skipping email.');
    return;
  }

  try {
    const { data, error } = await getResend().emails.send({
      from: process.env.EMAIL_FROM || 'VaultFS <onboarding@resend.dev>',
      to: [to],
      subject,
      html,
      text: text || html?.replace(/<[^>]+>/g, ''), // plain-text fallback
    });

    if (error) throw error;
    console.log(`✅ Email sent to ${to}`);
    return data;
  } catch (err) {
    console.error('❌ Email failed:', err.message);
    throw err;
  }
}

// ── HTML email templates (unchanged) ────────────────────────────────────────
const template = (body) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:520px;margin:40px auto;background:#111113;border:1px solid #27272a;border-radius:16px;overflow:hidden">
    <div style="padding:24px 32px;border-bottom:1px solid #27272a;background:#18181b">
      <span style="font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px">⚡ VaultFS</span>
    </div>
    <div style="padding:32px">${body}</div>
    <div style="padding:16px 32px;border-top:1px solid #27272a;background:#18181b">
      <p style="margin:0;font-size:12px;color:#52525b">
        This email was sent by VaultFS. If you didn't request this, you can safely ignore it.
      </p>
    </div>
  </div>
</body>
</html>
`;

const p  = (text, color = "#a1a1aa") => `<p style="margin:0 0 16px;font-size:14px;color:${color};line-height:1.6">${text}</p>`;
const h1 = (text)     => `<h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#fff">${text}</h1>`;
const btn = (text, url) =>
  `<a href="${url}" style="display:inline-block;margin:8px 0 20px;padding:12px 24px;background:#6366f1;color:#fff;font-size:14px;font-weight:600;border-radius:8px;text-decoration:none">${text}</a>`;
const code = (text) =>
  `<div style="margin:16px 0;padding:12px 16px;background:#18181b;border:1px solid #3f3f46;border-radius:8px;font-family:monospace;font-size:15px;color:#a78bfa;letter-spacing:2px">${text}</div>`;

// Email builders (unchanged)
const emails = {
  forgotPassword: (username, resetUrl) => ({
    subject: "Reset your VaultFS password",
    html: template(`
      ${h1("Reset your password")}
      ${p(`Hi ${username},`)}
      ${p("We received a request to reset your password. Click the button below to set a new one. This link expires in 2 hours.")}
      ${btn("Reset Password", resetUrl)}
      ${p("If you didn't request a password reset, you can ignore this email — your password won't change.", "#71717a")}
    `),
  }),

  verifyEmail: (username, verifyUrl) => ({
    subject: "Verify your VaultFS email",
    html: template(`
      ${h1("Verify your email")}
      ${p(`Welcome to VaultFS, ${username}!`)}
      ${p("Please verify your email address to activate all features.")}
      ${btn("Verify Email", verifyUrl)}
      ${p("This link expires in 24 hours.", "#71717a")}
    `),
  }),

  fileRequestSubmitted: (ownerName, requesterName, requestTitle, filesCount) => ({
    subject: `New files submitted to "${requestTitle}"`,
    html: template(`
      ${h1("Files submitted")}
      ${p(`Hi ${ownerName},`)}
      ${p(`<strong style="color:#fff">${requesterName}</strong> just submitted <strong style="color:#fff">${filesCount} file(s)</strong> to your file request "<strong style="color:#fff">${requestTitle}</strong>".`)}
      ${btn("View Submission", `${process.env.CLIENT_URL}/file-requests`)}
    `),
  }),

  fileDownloaded: (ownerName, fileName, downloaderInfo) => ({
    subject: `Your file "${fileName}" was downloaded`,
    html: template(`
      ${h1("File downloaded")}
      ${p(`Hi ${ownerName},`)}
      ${p(`Your file <strong style="color:#fff">${fileName}</strong> was downloaded.`)}
      ${p(`Details: ${downloaderInfo}`, "#71717a")}
      ${btn("View File", `${process.env.CLIENT_URL}/dashboard`)}
    `),
  }),
};

module.exports = { sendMail, emails };