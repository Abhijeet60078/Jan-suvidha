import Complaint from "../models/Complaint.js";

// Generates human-readable tracking IDs like UP-2026-000123
export const generateTrackingId = async () => {
  const year = new Date().getFullYear();
  const count = await Complaint.countDocuments({
    createdAt: {
      $gte: new Date(`${year}-01-01`),
      $lt: new Date(`${year + 1}-01-01`),
    },
  });
  const serial = String(count + 1).padStart(6, "0");
  return `UP-${year}-${serial}`;
};

// Priority auto-detection based on keywords in crime type / description.
// Real system would use a proper NLP classifier - this keyword engine
// keeps the project self-contained while still being a genuine feature.
const CRITICAL_KEYWORDS = ["murder", "rape", "kidnap", "acid attack", "life threat", "गोली", "हत्या", "बलात्कार", "अपहरण"];
const HIGH_KEYWORDS = ["assault", "domestic violence", "missing person", "robbery", "fire", "चोरी", "मारपीट", "आग"];
const MEDIUM_KEYWORDS = ["theft", "harassment", "fraud", "cheating", "धोखाधड़ी", "उत्पीड़न"];

export const detectPriority = (text = "") => {
  const t = text.toLowerCase();
  if (CRITICAL_KEYWORDS.some((k) => t.includes(k))) return "critical";
  if (HIGH_KEYWORDS.some((k) => t.includes(k))) return "high";
  if (MEDIUM_KEYWORDS.some((k) => t.includes(k))) return "medium";
  return "low";
};
