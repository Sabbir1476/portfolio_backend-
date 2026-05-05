const express = require("express");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const nodemailer = require("nodemailer");

const router = express.Router();

// ── Strict rate limit for contact form (5 req / 10 min per IP) ──
const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many messages sent. Please wait before trying again.",
  },
});

// ── Input validation schema ───────────────────────────────────
const contactSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name is too long"),
  email: z.string().email("Invalid email address"),
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(150, "Subject is too long"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message is too long"),
});

// ── Nodemailer transporter ────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ── POST /api/contact ─────────────────────────────────────────
router.post("/contact", contactLimiter, async (req, res, next) => {
  try {
    // Validate input
    const result = contactSchema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => e.message).join(", ");
      return res.status(400).json({ message: errors });
    }

    const { name, email, subject, message } = result.data;

    // Send email
    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"Portfolio Contact" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO_EMAIL,
      replyTo: email,
      subject: `[Portfolio] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      html: `
        <div style="font-family:monospace;background:#0a0e0f;color:#c8d8db;padding:24px;border-radius:8px;max-width:600px">
          <h2 style="color:#00ff88;margin-bottom:16px">New Portfolio Message</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="color:#7a9aa0;padding:4px 0;width:80px">Name</td><td style="color:#fff">${name}</td></tr>
            <tr><td style="color:#7a9aa0;padding:4px 0">Email</td><td style="color:#00d4ff">${email}</td></tr>
            <tr><td style="color:#7a9aa0;padding:4px 0">Subject</td><td style="color:#fff">${subject}</td></tr>
          </table>
          <hr style="border-color:#1e2d30;margin:16px 0">
          <p style="color:#c8d8db;line-height:1.6;white-space:pre-wrap">${message}</p>
        </div>
      `,
    });

    return res.status(200).json({ message: "Message sent successfully." });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
