import Complaint from "../models/Complaint.js";

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 10;

export const loginRateLimiter = (req, res, next) => {
  const key = `${req.ip}:${req.body?.phone || "unknown"}`;
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (!entry || now - entry.startedAt > LOGIN_WINDOW_MS) loginAttempts.set(key, { startedAt: now, count: 1 });
  else if (++entry.count > LOGIN_LIMIT) return res.status(429).json({ message: "Too many login attempts. Try again in 15 minutes." });
  next();
};

const MAX_COMPLAINTS_PER_DAY = 5;

// Deliberately implemented as a direct Mongo count rather than pulling in
// express-rate-limit: we already have exactly the data we need (this
// citizen's own complaints), and a package would add an in-memory or
// Redis-backed store we don't otherwise need for a single-endpoint limit.
export const complaintFilingLimiter = async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const countToday = await Complaint.countDocuments({
      $or: [{ submittedBy: req.user._id }, { complainant: req.user._id }],
      createdAt: { $gte: since },
    });

    if (countToday >= MAX_COMPLAINTS_PER_DAY) {
      return res.status(429).json({
        success: false,
        message: "You've reached the daily complaint limit. Please try again tomorrow.",
      });
    }

    next();
  } catch (err) {
    // Fail open: a rate-limit check failing should never block a legitimate
    // complaint from being filed.
    console.error("[rateLimiter] Failed to check complaint count:", err.message);
    next();
  }
};
