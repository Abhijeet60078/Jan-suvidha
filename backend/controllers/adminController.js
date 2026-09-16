import User from "../models/User.js";
import Complaint from "../models/Complaint.js";
import Department from "../models/Department.js";
import PerformanceLog from "../models/PerformanceLog.js";
import { sendNotification } from "../utils/notify.js";
import PDFDocument from "pdfkit";
import AuditLog from "../models/AuditLog.js";
import { recordAudit } from "../utils/audit.js";

// @desc State-wide dashboard summary (or department-wide, for a departmentHead)
export const getOverview = async (req, res) => {
  // A departmentHead only ever sees their own department's numbers; admin
  // sees everything state-wide. This is the only branch difference between
  // the two roles for this endpoint.
  const deptFilter = req.user.role === "departmentHead" ? { department: req.user.department } : {};

  const [totalComplaints, resolved, escalated, overdueUnresolved, byDept, byStatus] = await Promise.all([
    Complaint.countDocuments(deptFilter),
    Complaint.countDocuments({ ...deptFilter, status: { $in: ["resolved", "closed"] } }),
    Complaint.countDocuments({ ...deptFilter, status: "escalated" }),
    Complaint.countDocuments({ ...deptFilter, slaMissed: true, status: { $nin: ["resolved", "closed"] } }),
    Complaint.aggregate([
      ...(Object.keys(deptFilter).length ? [{ $match: deptFilter }] : []),
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "dept" } },
      { $unwind: "$dept" },
      { $project: { _id: 0, department: "$dept.nameEn", departmentHi: "$dept.nameHi", count: 1 } },
      { $sort: { count: -1 } },
    ]),
    Complaint.aggregate([
      ...(Object.keys(deptFilter).length ? [{ $match: deptFilter }] : []),
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]),
  ]);

  res.json({ totalComplaints, resolved, escalated, overdueUnresolved, byDept, byStatus });
};

export const getAnalytics = async (req, res) => {
  const match = req.user.role === "departmentHead" ? { department: req.user.department } : {};
  const [departments, districts, slaTrends] = await Promise.all([
    Complaint.aggregate([
      { $match: match }, { $group: { _id: "$department", total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0] } }, averageResolutionHours: { $avg: { $cond: [{ $and: ["$resolvedAt", "$createdAt"] }, { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 3600000] }, null] } } } },
      { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "department" } }, { $unwind: "$department" },
      { $project: { _id: 0, department: "$department.nameEn", total: 1, resolved: 1, resolutionRate: { $multiply: [{ $divide: ["$resolved", "$total"] }, 100] }, averageResolutionHours: { $round: [{ $ifNull: ["$averageResolutionHours", 0] }, 1] } } }, { $sort: { resolutionRate: -1 } },
    ]),
    Complaint.aggregate([{ $match: match }, { $group: { _id: "$district", total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0] } }, slaBreaches: { $sum: { $cond: ["$slaMissed", 1, 0] } } } }, { $project: { _id: 0, district: "$_id", total: 1, resolved: 1, slaBreaches: 1 } }, { $sort: { total: -1 } }]),
    Complaint.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, total: { $sum: 1 }, slaBreaches: { $sum: { $cond: ["$slaMissed", 1, 0] } } } }, { $project: { _id: 0, month: "$_id", total: 1, slaBreaches: 1 } }, { $sort: { month: 1 } }]),
  ]);
  res.json({ departments, districts, slaTrends });
};

const analyticsRows = (analytics) => analytics.departments.map((row) => [row.department, row.total, row.resolved, `${row.resolutionRate.toFixed(1)}%`, row.averageResolutionHours]);

export const exportAnalytics = async (req, res) => {
  const match = req.user.role === "departmentHead" ? { department: req.user.department } : {};
  const rows = await Complaint.aggregate([{ $match: match }, { $lookup: { from: "departments", localField: "department", foreignField: "_id", as: "department" } }, { $unwind: "$department" }, { $group: { _id: "$department.nameEn", total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0] } }, slaBreaches: { $sum: { $cond: ["$slaMissed", 1, 0] } } } }, { $sort: { _id: 1 } }]);
  if (req.query.format === "pdf") {
    res.setHeader("Content-Type", "application/pdf"); res.setHeader("Content-Disposition", "attachment; filename=jansuvidha-analytics.pdf");
    const doc = new PDFDocument({ margin: 50 }); doc.pipe(res); doc.fontSize(18).text("Jan Suvidha Analytics").moveDown();
    rows.forEach((row) => doc.fontSize(11).text(`${row._id}: ${row.total} total, ${row.resolved} resolved, ${row.slaBreaches} SLA breaches`)); doc.end(); return;
  }
  res.setHeader("Content-Type", "text/csv"); res.setHeader("Content-Disposition", "attachment; filename=jansuvidha-analytics.csv");
  res.send(["Department,Total,Resolved,SLA Breaches", ...rows.map((row) => [row._id, row.total, row.resolved, row.slaBreaches].join(","))].join("\n"));
};

// @desc Officer leaderboard / accountability table
export const getOfficerLeaderboard = async (req, res) => {
  const filter = { role: "officer" };
  if (req.query.department) filter.department = req.query.department;
  // departmentHead can only ever see officers within their own department.
  if (req.user.role === "departmentHead") filter.department = req.user.department;

  const officers = await User.find(filter)
    .select("name rating totalAssigned totalResolvedOnTime totalResolvedLate totalMissedSLA salaryEligible promotionEligible underReview department district")
    .populate("department", "nameEn nameHi")
    .sort({ rating: -1 });

  res.json({ officers });
};

// @desc Detailed rating history for one officer
export const getOfficerPerformanceLog = async (req, res) => {
  const logs = await PerformanceLog.find({ officer: req.params.officerId })
    .populate("complaint", "trackingId titleEn priority")
    .sort({ createdAt: -1 });
  res.json({ logs });
};

// @desc Manual admin rating adjustment (with reason, for audit trail)
export const adjustOfficerRating = async (req, res) => {
  const { change, reason } = req.body;
  const officer = await User.findById(req.params.officerId);
  if (!officer || officer.role !== "officer") return res.status(404).json({ message: "Officer not found" });

  const before = officer.rating;
  const after = Math.max(0, Math.min(100, before + Number(change)));
  officer.rating = after;
  officer.salaryEligible = after >= 60;
  officer.promotionEligible = after >= 50;
  officer.underReview = after < 40;
  await officer.save();

  await PerformanceLog.create({
    officer: officer._id,
    action: "manual_admin_adjustment",
    ratingBefore: before,
    ratingChange: Number(change),
    ratingAfter: after,
    reason,
  });
  await recordAudit(req, "officer_rating_adjusted", "officer", officer._id, { change, reason });

  res.json({ officer: officer.toSafeObject() });
};

export const getAuditLogs = async (req, res) => {
  const logs = await AuditLog.find().populate("actor", "name role").sort({ createdAt: -1 }).limit(200);
  res.json({ logs });
};

export const setAdminTwoFactor = async (req, res) => {
  const enabled = !!req.body.enabled;
  req.user.twoFactorEnabled = enabled;
  await req.user.save();
  await recordAudit(req, enabled ? "admin_2fa_enabled" : "admin_2fa_disabled", "user", req.user._id);
  res.json({ enabled });
};

// @desc List all departments
// NOTE: kept as GET /admin/departments (existing, public) for the citizen
// complaint-filing dropdown. Admin's department management screen also
// reads from this endpoint; isActiveOnly=false lets it see deactivated ones too.
export const listDepartments = async (req, res) => {
  const filter = req.query.includeInactive === "true" ? {} : { isActive: true };
  const departments = await Department.find(filter).sort({ nameEn: 1 });
  res.json({ departments });
};

// @desc Admin creates/updates a department
export const upsertDepartment = async (req, res) => {
  try {
    const { id, ...data } = req.body;
    let dept;
    if (id) {
      dept = await Department.findByIdAndUpdate(id, data, { new: true, runValidators: true });
      if (!dept) return res.status(404).json({ message: "Department not found" });
    } else {
      dept = await Department.create(data);
    }
    res.status(201).json({ department: dept });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key on the unique `code` or `nameEn` index.
      return res.status(409).json({ message: "A department with this code or name already exists" });
    }
    res.status(500).json({ message: "Failed to save department", error: err.message });
  }
};

// @desc Deactivate/reactivate a department (soft-delete, so existing
// complaints referencing it are never orphaned).
export const setDepartmentActive = async (req, res) => {
  const { isActive } = req.body;
  const dept = await Department.findByIdAndUpdate(
    req.params.id,
    { isActive: !!isActive },
    { new: true }
  );
  if (!dept) return res.status(404).json({ message: "Department not found" });
  res.json({ department: dept });
};

// @desc Admin: view every complaint in the system, with optional filters.
// This is the API the "all complaints" admin screen (and assignment UI) uses.
// A departmentHead is restricted to their own department regardless of what
// `department` filter (if any) they pass in the query string.
export const getAllComplaints = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status; // e.g. ?status=escalated for the Escalated tab
  if (req.query.department) filter.department = req.query.department;
  if (req.query.district) filter.district = req.query.district;
  if (req.query.priority) filter.priority = req.query.priority;
  if (req.user.role === "departmentHead") filter.department = req.user.department;

  const complaints = await Complaint.find(filter)
    .populate("department", "nameEn nameHi code")
    .populate("assignedOfficer", "name rating district")
    .populate("complainant", "name phone")
    .sort({ createdAt: -1 })
    .limit(500);

  res.json({ complaints });
};

// @desc Admin assigns/reassigns a complaint to any officer (department-agnostic
// admin override; the department-scoped version already exists at
// POST /complaints/:id/assign for departmentHead/admin).
export const adminAssignComplaint = async (req, res) => {
  const { officerId } = req.body;
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ message: "Complaint not found" });

  const officer = await User.findOne({ _id: officerId, role: "officer" });
  if (!officer) return res.status(404).json({ message: "Officer not found" });

  const previousOfficerId = complaint.assignedOfficer;
  complaint.assignedOfficer = officer._id;
  complaint.assignedAt = new Date();
  if (complaint.status === "submitted" || complaint.status === "underReview") {
    complaint.status = "assigned";
  }
  complaint.notes.push({
    author: req.user._id,
    authorName: req.user.name,
    message: `Assigned to officer ${officer.name} by admin`,
  });
  complaint.history.push({
    action: "assignment",
    byUser: req.user._id,
    byUserName: req.user.name,
    fromValue: previousOfficerId?.toString() || "unassigned",
    toValue: officer.name,
  });
  await complaint.save();
  await recordAudit(req, "complaint_assigned", "complaint", complaint._id, { officerId });

  officer.totalAssigned += 1;
  await officer.save();

  if (complaint.complainant) {
    const citizen = await User.findById(complaint.complainant);
    if (citizen) {
      await sendNotification(
        citizen,
        "assigned",
        `Your complaint ${complaint.trackingId} has been assigned to an officer.`,
        { complaint, io: req.app.get("io") }
      );
    }
  }

  res.json({ complaint });
};

// @desc Admin changes a complaint's priority (and recomputes its SLA deadline
// off the same createdAt so the deadline stays consistent with the new priority).
export const changeComplaintPriority = async (req, res) => {
  const { priority } = req.body;
  if (!["low", "medium", "high", "critical"].includes(priority)) {
    return res.status(400).json({ message: "Invalid priority value" });
  }
  const complaint = await Complaint.findById(req.params.id).populate("department");
  if (!complaint) return res.status(404).json({ message: "Complaint not found" });

  const previousPriority = complaint.priority;
  complaint.priority = priority;
  const slaHours = complaint.department.slaHours[priority] ?? complaint.department.slaHours.medium;
  const deadline = new Date(complaint.createdAt);
  deadline.setHours(deadline.getHours() + slaHours);
  complaint.slaDeadline = deadline;
  complaint.history.push({
    action: "priority_change",
    byUser: req.user._id,
    byUserName: req.user.name,
    fromValue: previousPriority,
    toValue: priority,
  });

  await complaint.save();
  await recordAudit(req, "complaint_priority_changed", "complaint", complaint._id, { priority });
  res.json({ complaint });
};

// @desc List officers (and department heads) for admin management screens.
export const listOfficers = async (req, res) => {
  const filter = { role: { $in: ["officer", "departmentHead"] } };
  if (req.query.department) filter.department = req.query.department;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
  if (req.user.role === "departmentHead") filter.department = req.user.department;

  const officers = await User.find(filter)
    .select("-password")
    .populate("department", "nameEn nameHi code")
    .sort({ name: 1 });

  res.json({ officers });
};

// @desc Admin updates an officer/departmentHead's profile fields.
export const updateOfficer = async (req, res) => {
  const { name, department, district, designation } = req.body;
  const officer = await User.findOne({
    _id: req.params.officerId,
    role: { $in: ["officer", "departmentHead"] },
  });
  if (!officer) return res.status(404).json({ message: "Officer not found" });

  if (name !== undefined) officer.name = name;
  if (department !== undefined) officer.department = department;
  if (district !== undefined) officer.district = district;
  if (designation !== undefined) officer.designation = designation;

  await officer.save();
  await recordAudit(req, "staff_status_changed", "user", officer._id, { isActive: officer.isActive });
  res.json({ officer: officer.toSafeObject() });
};

// @desc Admin activates/deactivates an officer account (deactivated users
// cannot log in — enforced by the `protect` middleware's isActive check).
export const setOfficerActive = async (req, res) => {
  const { isActive } = req.body;
  const officer = await User.findOne({
    _id: req.params.officerId,
    role: { $in: ["officer", "departmentHead"] },
  });
  if (!officer) return res.status(404).json({ message: "Officer not found" });

  officer.isActive = !!isActive;
  await officer.save();
  res.json({ officer: officer.toSafeObject() });
};
