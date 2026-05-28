const nodemailer = require('nodemailer');

const FROM_EMAIL = 'krunalanaghan108@gmail.com';
const FROM_NAME  = 'Meesho Supplier Panel';

function createTransporter() {
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: FROM_EMAIL, pass },
  });
}

async function send({ to, subject, html }) {
  const t = createTransporter();
  if (!t) {
    console.log(`[Email] GMAIL_APP_PASSWORD not set — skipping email to ${to}`);
    return false;
  }
  try {
    await t.sendMail({ from: `"${FROM_NAME}" <${FROM_EMAIL}>`, to, subject, html });
    console.log(`[Email] Sent "${subject}" → ${to}`);
    return true;
  } catch (err) {
    console.error('[Email] Send failed:', err.message);
    return false;
  }
}

function baseHtml(content) {
  return `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f6fa;font-family:Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden">
    <div style="background:linear-gradient(135deg,#f43397,#c0007b);padding:24px;text-align:center">
      <span style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px">meesho</span>
      <p style="color:rgba(255,255,255,.8);font-size:12px;margin:4px 0 0">Supplier Multi-Account Panel</p>
    </div>
    <div style="padding:28px">
      ${content}
    </div>
    <div style="background:#f9fafb;padding:16px;text-align:center;border-top:1px solid #e5e7eb">
      <p style="font-size:11px;color:#9ca3af;margin:0">This email was sent from Meesho Multi-Account Supplier Panel</p>
    </div>
  </div>
</body></html>`;
}

async function sendAccountConnected({ to, accountName, storeName, meeshoEmail, username }) {
  return send({
    to,
    subject: `✅ Account Connected — ${accountName}`,
    html: baseHtml(`
      <h2 style="color:#111;font-size:18px;margin:0 0 16px">Account Connected ✅</h2>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin-bottom:20px">
        <p style="margin:0;font-size:14px;color:#166534">
          <strong>${accountName}</strong>${storeName ? ` (${storeName})` : ''} has been successfully connected.
        </p>
      </div>
      <table style="width:100%;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#6b7280">Meesho Email</td><td style="padding:6px 0;color:#111;font-weight:600">${meeshoEmail}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Panel User</td><td style="padding:6px 0;color:#111">${username}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Connected At</td><td style="padding:6px 0;color:#111">${new Date().toLocaleString('en-IN')}</td></tr>
      </table>
    `),
  });
}

async function sendAccountDisconnected({ to, accountName, username }) {
  return send({
    to,
    subject: `⚠️ Account Disconnected — ${accountName}`,
    html: baseHtml(`
      <h2 style="color:#111;font-size:18px;margin:0 0 16px">Account Disconnected ⚠️</h2>
      <p style="font-size:14px;color:#374151">
        <strong>${accountName}</strong> has been disconnected from your panel by <strong>${username}</strong>.
      </p>
      <p style="font-size:13px;color:#6b7280;margin-top:12px">
        Reconnect at any time from the Accounts page by entering your Meesho password.
      </p>
    `),
  });
}

async function sendNewUserCreated({ to, newUsername, newEmail, createdBy }) {
  return send({
    to,
    subject: `👤 New Panel User Created — ${newUsername}`,
    html: baseHtml(`
      <h2 style="color:#111;font-size:18px;margin:0 0 16px">New User Created 👤</h2>
      <table style="width:100%;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#6b7280">Username</td><td style="padding:6px 0;color:#111;font-weight:600">${newUsername}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0;color:#111">${newEmail}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Created By</td><td style="padding:6px 0;color:#111">${createdBy}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Created At</td><td style="padding:6px 0;color:#111">${new Date().toLocaleString('en-IN')}</td></tr>
      </table>
    `),
  });
}

module.exports = { sendAccountConnected, sendAccountDisconnected, sendNewUserCreated };
