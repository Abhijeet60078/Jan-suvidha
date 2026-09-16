import cron from "node-cron";
import { runSLASweep } from "./accountabilityEngine.js";
import Complaint from "../models/Complaint.js";
import User from "../models/User.js";
import { sendNotification } from "./notify.js";

const sendDueFollowUps = async (io) => {
  const due = await Complaint.find({ followUpAt: { $lte: new Date() }, followUpNotified: false, assignedOfficer: { $exists: true } });
  for (const complaint of due) {
    const officer = await User.findById(complaint.assignedOfficer);
    if (officer) await sendNotification(officer, "general", `Follow-up due for complaint ${complaint.trackingId}${complaint.followUpNote ? `: ${complaint.followUpNote}` : "."}`, { complaint, io });
    complaint.followUpNotified = true;
    await complaint.save();
  }
};

// Runs every 15 minutes. In production this cadence can be tightened for
// critical-priority complaints, but 15 min keeps the demo responsive
// without hammering the DB.
export const startSLACron = (io) => {
  cron.schedule("*/15 * * * *", async () => {
    try {
      const count = await runSLASweep(io);
      await sendDueFollowUps(io);
      if (count > 0) {
        console.log(`[SLA Cron] Flagged ${count} overdue complaint(s) and applied rating penalties.`);
      }
    } catch (err) {
      console.error("[SLA Cron] Error running sweep:", err.message);
    }
  });
  console.log("[SLA Cron] Scheduled - running every 15 minutes.");
};
