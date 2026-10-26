/**
 * VERCEL SERVERLESS FUNCTION — /api/contact
 * Receives the contact-form POST and delivers it to Gmail over SMTP.
 *
 * Required environment variables (Vercel → Project → Settings → Environment Variables):
 *   GMAIL_USER          e.g. chauhandev591@gmail.com
 *   GMAIL_APP_PASSWORD  16-char Gmail App Password (Google Account → Security → 2FA → App passwords)
 *   CONTACT_TO          (optional) override recipient; defaults to GMAIL_USER
 *
 * Local dev (after `npm i`):  vercel dev   → http://localhost:3000/api/contact
 */
const nodemailer = require('nodemailer');

const ALLOWED_ORIGIN_RE = /^https?:\/\/(localhost(:\d+)?|127\.0\.0\.1(:\d+)?|[\w.-]+\.vercel\.app)$/i;

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const origin = req.headers.origin || '';
  if (origin && !ALLOWED_ORIGIN_RE.test(origin)) {
    return res.status(403).json({ ok: false, error: 'Origin not allowed' });
  }

  const { name, email, message, 'bot-field': bot } = req.body || {};

  /* honeypot: pretend success so bots move on */
  if (bot) return res.status(200).json({ ok: true });

  const errors = [];
  if (!name || typeof name !== 'string' || name.length > 120) errors.push('name');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 200) errors.push('email');
  if (!message || typeof message !== 'string' || message.length > 5000) errors.push('message');
  if (errors.length) return res.status(400).json({ ok: false, error: 'Invalid fields: ' + errors.join(', ') });

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.error('Missing GMAIL_USER / GMAIL_APP_PASSWORD env vars');
    return res.status(500).json({ ok: false, error: 'Server not configured' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"Portfolio contact" <${user}>`,
      replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
      to: process.env.CONTACT_TO || user,
      subject: `Portfolio message from ${name.replace(/[\r\n]/g, ' ')}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        '',
        message,
      ].join('\n'),
      html: [
        `<p><strong>Name:</strong> ${escapeHtml(name)}</p>`,
        `<p><strong>Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>`,
        `<hr>`,
        `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
      ].join('\n'),
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Mail send failed:', err && err.message);
    return res.status(500).json({ ok: false, error: 'Send failed' });
  }
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
