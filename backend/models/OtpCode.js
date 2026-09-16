import mongoose from "mongoose";

const otpCodeSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, index: true },
    purpose: { type: String, enum: ["login", "verify_phone", "reset_password"], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    attempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

otpCodeSchema.index({ phone: 1, purpose: 1, createdAt: -1 });

export default mongoose.model("OtpCode", otpCodeSchema);
