import Complaint from "../models/Complaint.js";
import Department from "../models/Department.js";
import User from "../models/User.js";
import { generateTrackingId, detectPriority } from "../utils/trackingId.js";
import { evaluateResolution } from "../utils/accountabilityEngine.js";
import { filesToAttachments } from "../middleware/upload.js";
import { sendNotification } from "../utils/notify.js";

const computeSLADeadline = (hoursFromDept) => {
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + hoursFromDept);
  return deadline;
};

// @desc Citizen files a new complaint
export const fileComplaint = async (req, res) => {
  try {
    const {
      department, crimeType, titleEn, descriptionEn, descriptionHi,
      district, address, location, isAnonymous,
    } = req.body;

    if (!department || !crimeType || !titleEn || !descriptionEn || !district) {
      return res.status(400).json({ message: "Missing required complaint fields" });
    }

    const dept = await Department.findById(department);
    if (!dept) return res.status(404).json({ message: "Department not found" });

    const priority = detectPriority(`${crimeType} ${descriptionEn} ${descriptionHi || ""}`);
    const slaHours = dept.slaHours[priority] ?? dept.slaHours.medium;

    const trackingId = await generateTrackingId();

    // req.body values arrive as strings when the request is multipart/form-data
    // (i.e. whenever photos are attached) rather than plain JSON.
    const anonymous = isAnonymous === true || isAnonymous === "true";
    let parsedLocation = location;
    if (typeof location === "string" && location) {
      try { parsedLocation = JSON.parse(location); } catch { parsedLocation = undefined; }
    }

    // Duplicate-complaint check: soft warning only, never blocks submission.
    const possibleDuplicates = await Complaint.find({
      department,
      crimeType,
      district,
      status: { $nin: ["resolved", "closed"] },
      createdAt: { $gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
    })
      .select("trackingId titleEn createdAt status")
      .limit(5);

    const complaint = await Complaint.create({
      trackingId,
      complainant: anonymous ? undefined : req.user._id,
      submittedBy: req.user._id,
      isAnonymous: anonymous,
      department,
      crimeType,
      titleEn,
      descriptionEn,
      descriptionHi,
      district,
      address,
      location: parsedLocation,
      evidenceUrls: filesToAttachments(req.files),
      priority,
      status: "submitted",
      slaDeadline: computeSLADeadline(slaHours),
    });

    const responseComplaint = complaint.toObject();
    delete responseComplaint.submittedBy;
    res.status(201).json({ complaint: responseComplaint, possibleDuplicates });
  } catch (err) {
    res.status(500).json({ message: "Failed to file complaint", error: err.message });
  }
};

// @desc Citizen views their own complaints
export const getMyComplaints = async (req, res) => {
  const complaints = await Complaint.find({ complainant: req.user._id })
    .populate("department", "nameEn nameHi code")
    .sort({ createdAt: -1 });
  res.json({ complaints });
};

// @desc Get a single complaint by id, with role-based ownership enforcement.
// Citizen -> only their own complaint. Officer -> only if assigned to them.
// departmentHead -> only within their department. admin -> any complaint.
export const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("department", "nameEn nameHi code")
      .populate("assignedOfficer", "name rating");
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    const { role, _id } = req.user;
    if (role === "citizen" && complaint.complainant?.toString() !== _id.toString()) {
      return res.status(403).json({ message: "You can only view your own complaints" });
    }
    if (role === "officer" && complaint.assignedOfficer?._id?.toString() !== _id.toString()) {
      return res.status(403).json({ message: "This complaint is not assigned to you" });
    }
    if (role === "departmentHead" && complaint.department?._id?.toString() !== req.user.department?.toString()) {
      return res.status(403).json({ message: "This complaint is outside your department" });
    }
    if (role === "citizen") complaint.internalNotes = undefined;
    // admin: no restriction

    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch complaint", error: err.message });
  }
};

export const uploadEvidence = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    const isCitizenOwner = req.user.role === "citizen" && complaint.complainant?.toString() === req.user._id.toString();
    const isOfficerOwner = req.user.role === "officer" && complaint.assignedOfficer?.toString() === req.user._id.toString();
    const isPrivileged = ["admin", "departmentHead"].includes(req.user.role);
    if (!isCitizenOwner && !isOfficerOwner && !isPrivileged) return res.status(403).json({ message: "You cannot add evidence to this complaint" });
    if (!req.files?.length) return res.status(400).json({ message: "Select at least one attachment" });
    if (isOfficerOwner || req.body.type === "resolution") complaint.resolutionAttachments.push(...filesToAttachments(req.files));
    else complaint.evidenceUrls.push(...filesToAttachments(req.files));
    await complaint.save();
    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ message: "Failed to upload attachments", error: err.message });
  }
};

// @desc Public tracking by trackingId (no login required, matches real FIR portals)
export const trackByTrackingId = async (req, res) => {
  const complaint = await Complaint.findOne({ trackingId: req.params.trackingId })
    .populate("department", "nameEn nameHi code")
    .select("-notes.author");
  if (!complaint) return res.status(404).json({ message: "No complaint found with this tracking ID" });
  complaint.internalNotes = undefined;
  res.json({ complaint });
};

// @desc Officer views complaints assigned to them
export const getAssignedComplaints = async (req, res) => {
  const filter = { assignedOfficer: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const complaints = await Complaint.find(filter)
    .populate("department", "nameEn nameHi code")
    .sort({ priority: 1, slaDeadline: 1 });
  res.json({ complaints });
};

// @desc Department head views all complaints in their department
export const getDepartmentComplaints = async (req, res) => {
  const filter = { department: req.user.department };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.district) filter.district = req.query.district;
  const complaints = await Complaint.find(filter)
    .populate("department", "nameEn nameHi code")
    .populate("assignedOfficer", "name rating")
    .sort({ createdAt: -1 });
  res.json({ complaints });
};

// @desc Department head assigns a complaint to an officer
export const assignComplaint = async (req, res) => {
  try {
    const { officerId } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    const officer = await User.findOne({ _id: officerId, role: "officer", department: complaint.department });
    if (!officer) return res.status(404).json({ message: "Officer not found in this department" });

    const previousOfficerId = complaint.assignedOfficer;
    complaint.assignedOfficer = officer._id;
    complaint.assignedAt = new Date();
    complaint.status = "assigned";
    complaint.notes.push({
      author: req.user._id,
      authorName: req.user.name,
      message: `Assigned to officer ${officer.name}`,
    });
    complaint.history.push({
      action: "assignment",
      byUser: req.user._id,
      byUserName: req.user.name,
      fromValue: previousOfficerId?.toString() || "unassigned",
      toValue: officer.name,
    });
    await complaint.save();

    officer.totalAssigned += 1;
    await officer.save();

    if (complaint.complainant) {
      const citizen = await User.findById(complaint.complainant);
      if (citizen) {
        await sendNotification(
          citizen,
          "assigned",
          `Your complaint ${complaint.trackingId} has been assigned to an officer and is now being processed.`,
          { complaint, io: req.app.get("io") }
        );
      }
    }

    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ message: "Failed to assign complaint", error: err.message });
  }
};

// @desc Officer updates status / adds a note
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    const isOwner = complaint.assignedOfficer?.toString() === req.user._id.toString();
    const isPrivileged = ["departmentHead", "admin"].includes(req.user.role);
    if (!isOwner && !isPrivileged) {
      return res.status(403).json({ message: "You are not assigned to this complaint" });
    }

    if (note) {
      const noteTarget = req.body.internal === "true" || req.body.internal === true ? complaint.internalNotes : complaint.notes;
      noteTarget.push({ author: req.user._id, authorName: req.user.name, message: note });
    }
    if (req.body.followUpAt) complaint.followUpAt = new Date(req.body.followUpAt);
    if (req.body.followUpNote) complaint.followUpNote = req.body.followUpNote;

    const previousStatus = complaint.status;

    if (status === "resolved") {
      if (req.files?.length) {
        complaint.resolutionAttachments.push(...filesToAttachments(req.files));
      }
      complaint.notes.push({ author: req.user._id, authorName: req.user.name, message: "Marked resolved" });
      complaint.history.push({
        action: "status_change", byUser: req.user._id, byUserName: req.user.name,
        fromValue: previousStatus, toValue: "resolved",
      });
      await evaluateResolution(complaint);
    } else if (status) {
      complaint.status = status;
      complaint.history.push({
        action: "status_change", byUser: req.user._id, byUserName: req.user.name,
        fromValue: previousStatus, toValue: status,
      });
      await complaint.save();
    } else {
      await complaint.save();
    }

    if (status && status !== previousStatus && complaint.complainant) {
      const citizen = await User.findById(complaint.complainant);
      if (citizen) {
        const statusMessages = {
          investigation: `An officer has started investigating your complaint ${complaint.trackingId}.`,
          resolved: `Your complaint ${complaint.trackingId} has been marked resolved. Please rate your experience.`,
        };
        await sendNotification(
          citizen,
          status === "resolved" ? "resolved" : "status_change",
          statusMessages[status] || `Your complaint ${complaint.trackingId} status changed to "${status}".`,
          { complaint, io: req.app.get("io") }
        );
      }
    }

    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ message: "Failed to update complaint", error: err.message });
  }
};

export const bulkUpdateComplaintStatus = async (req, res) => {
  try {
    const { complaintIds, status } = req.body;
    const allowedStatuses = ["underReview", "investigation", "resolved", "closed"];
    if (!Array.isArray(complaintIds) || !complaintIds.length || !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Complaint IDs and a valid status are required" });
    }
    const filter = req.user.role === "officer"
      ? { _id: { $in: complaintIds }, assignedOfficer: req.user._id }
      : { _id: { $in: complaintIds } };
    const complaints = await Complaint.find(filter);
    for (const complaint of complaints) {
      const previousStatus = complaint.status;
      complaint.status = status;
      complaint.history.push({ action: "status_change", byUser: req.user._id, byUserName: req.user.name, fromValue: previousStatus, toValue: status });
      await complaint.save();
      if (complaint.complainant) {
        const citizen = await User.findById(complaint.complainant);
        if (citizen) await sendNotification(citizen, status === "resolved" ? "resolved" : "status_change", `Your complaint ${complaint.trackingId} status changed to "${status}".`, { complaint, io: req.app.get("io") });
      }
    }
    res.json({ updated: complaints.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to update complaints", error: err.message });
  }
};

// @desc Citizen rates a resolved complaint
export const rateComplaint = async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    if (complaint.complainant?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only rate your own complaint" });
    }
    if (complaint.status !== "resolved") {
      return res.status(400).json({ message: "Complaint must be resolved before rating" });
    }
    complaint.citizenRating = rating;
    complaint.citizenFeedback = feedback;
    complaint.status = "closed";
    await complaint.save();
    res.json({ complaint });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit rating", error: err.message });
  }
};

// @desc Citizen manually escalates an overdue complaint
export const escalateComplaint = async (req, res) => {
  const complaint = await Complaint.findById(req.params.id);
  if (!complaint) return res.status(404).json({ message: "Complaint not found" });
  if (complaint.complainant?.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "You can only escalate your own complaint" });
  }
  complaint.status = "escalated";
  complaint.escalationCount += 1;
  complaint.notes.push({ author: req.user._id, authorName: req.user.name, message: "Escalated by citizen" });
  await complaint.save();
  res.json({ complaint });
};

export const reopenComplaint = async (req, res) => {
  const complaint = await Complaint.findOne({ _id: req.params.id, complainant: req.user._id });
  if (!complaint) return res.status(404).json({ message: "Complaint not found" });
  if (!["resolved", "closed"].includes(complaint.status)) return res.status(400).json({ message: "Only resolved complaints can be reopened" });
  const previousStatus = complaint.status;
  complaint.status = "underReview";
  complaint.history.push({ action: "status_change", byUser: req.user._id, byUserName: req.user.name, fromValue: previousStatus, toValue: "underReview" });
  complaint.notes.push({ author: req.user._id, authorName: req.user.name, message: "Reopened by citizen" });
  await complaint.save();
  if (complaint.assignedOfficer) {
    const officer = await User.findById(complaint.assignedOfficer);
    if (officer) await sendNotification(officer, "status_change", `Complaint ${complaint.trackingId} was reopened by the citizen.`, { complaint, io: req.app.get("io") });
  }
  res.json({ complaint });
};
