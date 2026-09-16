import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
    type: {
      type: String,
      enum: ["assigned", "status_change", "sla_breach", "resolved", "general"],
      default: "general",
    },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
