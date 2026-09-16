import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    nameEn: { type: String, required: true, unique: true, trim: true },
    nameHi: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true }, // e.g. POLICE, ELEC, WATER
    descriptionEn: { type: String, trim: true },
    descriptionHi: { type: String, trim: true },

    // SLA in hours, per priority level, configurable per department
    slaHours: {
      low: { type: Number, default: 168 }, // 7 days
      medium: { type: Number, default: 72 }, // 3 days
      high: { type: Number, default: 24 }, // 1 day
      critical: { type: Number, default: 6 }, // 6 hours
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Department", departmentSchema);
