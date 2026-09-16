import Notification from "../models/Notification.js";

/*
  NOTIFICATION UTILITY
  ---------------------
  sendNotification() is the single place every part of the app calls to
  tell a user something changed. It always does two things (zero config
  required):
    1. console.log's the notification
    2. stores it in the Notification collection, so GET /api/notifications/mine
       has something to return and the Navbar bell icon works out of the box

  Two more channels are opt-in:
    - Email, via nodemailer, only if EMAIL_ENABLED=true in .env. Requires
      the "nodemailer" package (NOT currently in package.json — install it
      with `npm install nodemailer` if you turn EMAIL_ENABLED on; if it's
      off, or the package isn't installed, this silently no-ops and only
      logs a message, it never throws or blocks the calling request).
    - Socket.io push, if an `io` instance is passed in (server.js already
      creates one and attaches it via app.set("io", io); controllers pass
      it through as req.app.get("io")). This gives real-time delivery to
      anyone with the app open, on top of the polling-based /mine endpoint.

  SMS is intentionally NOT implemented — see sendSmsStub() below. Wiring a
  real provider (Twilio, MSG91, etc.) later should only require filling in
  that one function; nothing else in the app needs to change.
*/

let cachedTransporter = null;

const getEmailTransporter = async () => {
  if (cachedTransporter) return cachedTransporter;
  try {
    const nodemailer = await import("nodemailer");
    cachedTransporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
    return cachedTransporter;
  } catch (err) {
    console.warn(
      "[notify] EMAIL_ENABLED=true but the 'nodemailer' package isn't installed. " +
        "Run `npm install nodemailer` in backend/ to enable email notifications. " +
        "Continuing without email."
    );
    return null;
  }
};

const sendEmail = async (user, message) => {
  if (process.env.EMAIL_ENABLED !== "true" || !user.email) return;
  try {
    const transporter = await getEmailTransporter();
    if (!transporter) return;
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "no-reply@jansuvidha.up.gov.in",
      to: user.email,
      subject: "Jan Suvidha — Complaint Update",
      text: message,
    });
  } catch (err) {
    // Never let an email failure break the request that triggered it.
    console.error("[notify] Email send failed:", err.message);
  }
};

// TODO(sms): wire a real provider here (Twilio, MSG91, etc.) using
// user.phone. Keep the same signature so callers never need to change.
const sendSmsStub = (user, message) => {
  // Intentionally not implemented — see the SMS section of the upgrade spec.
};

/**
 * @param {object} user - Mongoose User document (or plain object with _id/email/phone)
 * @param {string} type - one of the Notification model's `type` enum values
 * @param {string} message - human-readable notification text
 * @param {object} [options]
 * @param {object} [options.complaint] - related Complaint document/id, if any
 * @param {import("socket.io").Server} [options.io] - pass req.app.get("io") to push in real time
 */
export const sendNotification = async (user, type, message, { complaint, io } = {}) => {
  if (!user?._id) return null;

  console.log(`[notify] -> ${user.name || user._id} (${type}): ${message}`);

  const notification = await Notification.create({
    user: user._id,
    complaint: complaint?._id || complaint,
    type,
    message,
  });

  if (io) {
    io.to(user._id.toString()).emit("notification", notification);
  }

  await sendEmail(user, message);
  sendSmsStub(user, message);

  return notification;
};
