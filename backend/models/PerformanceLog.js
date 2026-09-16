import mongoose from "mongoose";

/*
  Immutable audit trail of every rating change applied to an officer.
  This is what powers the "why did my rating change" transparency view
  and the admin accountability dashboard.
*/
const performanceLogSchema = new mongoose.Schema(
  {
    officer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
    action: {
      type: String,
      enum: ["sla_missed", "resolved_on_time", "resolved_late", "manual_admin_adjustment"],
      required: true,
    },
    ratingBefore: { type: Number, required: true },
    ratingChange: { type: Number, required: true },
    ratingAfter: { type: Number, required: true },
    reason: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("PerformanceLog", performanceLogSchema);
