import Complaint from "../models/Complaint.js";
import User from "../models/User.js";
import PerformanceLog from "../models/PerformanceLog.js";
import { sendNotification } from "./notify.js";

/*
  ACCOUNTABILITY ENGINE
  ---------------------
  This is the core rule-set that ties officer performance to SLA compliance.
  It is called:
    1. Periodically by the cron job (utils/slaCron.js) to catch complaints
       that silently blew past their deadline without being resolved.
    2. Directly when an officer marks a complaint resolved, to decide
       whether it was on-time or late.

  Rating rules (out of 100, floor 0):
    - SLA missed while still unresolved : -8  (worse for higher priority)
    - Resolved late (after deadline)    : -5
    - Resolved on time                  : +1 (small reward, capped at 100)

  Thresholds:
    - rating < 60  -> salaryEligible = false
    - rating < 50  -> promotionEligible = false
    - rating < 40  -> underReview = true (flagged for admin/department head)
*/

const PRIORITY_PENALTY_MULTIPLIER = {
  low: 1,
  medium: 1.25,
  high: 1.5,
  critical: 2,
};

const applyRatingChange = async ({ officerId, complaintId, action, baseChange, reason }) => {
  const officer = await User.findById(officerId);
  if (!officer) return;

  const before = officer.rating;
  const after = Math.max(0, Math.min(100, before + baseChange));

  officer.rating = after;
  officer.salaryEligible = after >= 60;
  officer.promotionEligible = after >= 50;
  officer.underReview = after < 40;

  await officer.save();

  await PerformanceLog.create({
    officer: officerId,
    complaint: complaintId,
    action,
    ratingBefore: before,
    ratingChange: baseChange,
    ratingAfter: after,
    reason,
  });

  return officer;
};

// Called by cron: find complaints past their SLA deadline that are still open
// and haven't already been penalized.
export const runSLASweep = async (io) => {
  const now = new Date();
  const overdue = await Complaint.find({
    slaDeadline: { $lt: now },
    slaMissed: false,
    status: { $in: ["submitted", "underReview", "assigned", "investigation"] },
  });

  for (const complaint of overdue) {
    complaint.slaMissed = true;
    if (complaint.status !== "escalated") {
      complaint.status = "escalated";
      complaint.escalationCount += 1;
    }
    await complaint.save();

    if (complaint.assignedOfficer) {
      const multiplier = PRIORITY_PENALTY_MULTIPLIER[complaint.priority] || 1;
      const penalty = -Math.round(8 * multiplier);

      const officer = await User.findById(complaint.assignedOfficer);
      // NOTE: totalMissedSLA already existed on the User model for exactly
      // this purpose — reused here rather than adding a duplicate
      // "slaBreaches" field.
      if (officer) officer.totalMissedSLA += 1, await officer.save();

      await applyRatingChange({
        officerId: complaint.assignedOfficer,
        complaintId: complaint._id,
        action: "sla_missed",
        baseChange: penalty,
        reason: `SLA missed on ${complaint.trackingId} (priority: ${complaint.priority})`,
      });

      if (officer) {
        await sendNotification(
          officer,
          "sla_breach",
          `Complaint ${complaint.trackingId} has missed its SLA deadline. Your rating has been adjusted.`,
          { complaint, io }
        );

        if (officer.department) {
          const deptHead = await User.findOne({ role: "departmentHead", department: officer.department });
          if (deptHead) {
            await sendNotification(
              deptHead,
              "sla_breach",
              `Complaint ${complaint.trackingId} (officer: ${officer.name}) has missed its SLA deadline.`,
              { complaint, io }
            );
          }
        }
      }
    }
  }

  return overdue.length;
};

// Called when an officer/dept head marks a complaint resolved.
export const evaluateResolution = async (complaint) => {
  const now = new Date();
  const onTime = now <= complaint.slaDeadline;

  complaint.resolvedAt = now;
  complaint.resolvedOnTime = onTime;
  complaint.status = "resolved";
  await complaint.save();

  if (!complaint.assignedOfficer) return complaint;

  const officer = await User.findById(complaint.assignedOfficer);
  if (!officer) return complaint;

  if (onTime) {
    officer.totalResolvedOnTime += 1;
    await officer.save();
    await applyRatingChange({
      officerId: officer._id,
      complaintId: complaint._id,
      action: "resolved_on_time",
      baseChange: 1,
      reason: `Resolved on time: ${complaint.trackingId}`,
    });
  } else {
    officer.totalResolvedLate += 1;
    await officer.save();
    await applyRatingChange({
      officerId: officer._id,
      complaintId: complaint._id,
      action: "resolved_late",
      baseChange: -5,
      reason: `Resolved late: ${complaint.trackingId}`,
    });
  }

  return complaint;
};
