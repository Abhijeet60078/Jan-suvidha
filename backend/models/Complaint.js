import mongoose from "mongoose";

const noteSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: String,
    message: String,
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const complaintSchema = new mongoose.Schema(
  {
    trackingId: { type: String, required: true, unique: true }, // e.g. UP-2026-000123

    complainant: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", select: false },
    isAnonymous: { type: Boolean, default: false },

    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department", required: true },
    crimeType: { type: String, required: true, trim: true }, // free text category, e.g. "theft", "streetlight not working"

    titleEn: { type: String, required: true },
    descriptionEn: { type: String, required: true },
    descriptionHi: { type: String }, // optional, citizen may type directly in Hindi in either field

    district: { type: String, required: true },
    address: { type: String },
    location: {
      lat: Number,
      lng: Number,
    },

    // Citizen-submitted evidence photos (filed with the complaint).
    // This field already existed as an unused string array; upgraded to
    // richer objects here rather than adding a second, duplicate field.
    evidenceUrls: [
      {
        url: { type: String, required: true },
        resourceType: { type: String, enum: ["image", "video", "raw"], default: "image" },
        originalName: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Officer-submitted "proof of resolution" photos, attached when a
    // complaint is marked resolved.
    resolutionAttachments: [
      {
        url: { type: String, required: true },
        resourceType: { type: String, enum: ["image", "video", "raw"], default: "image" },
        originalName: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["submitted", "underReview", "assigned", "investigation", "resolved", "closed", "escalated"],
      default: "submitted",
    },

    assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date },

    slaDeadline: { type: Date, required: true },
    slaMissed: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedOnTime: { type: Boolean },

    notes: [noteSchema],
    internalNotes: [noteSchema],
    followUpAt: { type: Date },
    followUpNote: { type: String, trim: true },
    followUpNotified: { type: Boolean, default: false },

    // Audit trail for admin/oversight visibility — distinct from `notes`
    // above, which is the citizen-facing update feed. history logs every
    // structural change (status, priority, (re)assignment, department)
    // regardless of whether a human-readable note was also left.
    history: [
      {
        action: {
          type: String,
          enum: ["status_change", "priority_change", "assignment", "department_change"],
          required: true,
        },
        byUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        byUserName: String,
        fromValue: String,
        toValue: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    citizenRating: { type: Number, min: 1, max: 5 },
    citizenFeedback: { type: String },

    escalationCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

complaintSchema.index({ status: 1, department: 1 });
complaintSchema.index({ assignedOfficer: 1, status: 1 });
complaintSchema.index({ submittedBy: 1, createdAt: -1 });

export default mongoose.model("Complaint", complaintSchema);
