import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/*
  Single User model shared by all roles:
  - citizen        : files complaints
  - officer        : resolves complaints for one department/district
  - departmentHead  : oversees officers within one department
  - admin           : state-level super admin
*/
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    preferredLanguage: { type: String, enum: ["en", "hi"], default: "hi" },

    role: {
      type: String,
      enum: ["citizen", "officer", "departmentHead", "admin"],
      default: "citizen",
    },

    // Officer / departmentHead specific fields
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    district: { type: String, trim: true },
    designation: { type: String, trim: true },

    // --- Accountability Engine fields (officer only) ---
    rating: { type: Number, default: 100, min: 0, max: 100 },
    totalAssigned: { type: Number, default: 0 },
    totalResolvedOnTime: { type: Number, default: 0 },
    totalResolvedLate: { type: Number, default: 0 },
    totalMissedSLA: { type: Number, default: 0 },
    salaryEligible: { type: Boolean, default: true },
    promotionEligible: { type: Boolean, default: true },
    underReview: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
    phoneVerified: { type: Boolean, default: false },
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    twoFactorEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model("User", userSchema);
