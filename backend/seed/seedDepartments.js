import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";
import Department from "../models/Department.js";
import User from "../models/User.js";
import Complaint from "../models/Complaint.js";
import { generateTrackingId } from "../utils/trackingId.js";

dotenv.config();

const departments = [
  { nameEn: "Police (Crime & FIR)", nameHi: "पुलिस (अपराध एवं एफआईआर)", code: "POLICE",
    descriptionEn: "Theft, assault, missing persons, and all criminal matters.",
    descriptionHi: "चोरी, मारपीट, गुमशुदगी और सभी आपराधिक मामले।",
    slaHours: { low: 168, medium: 72, high: 24, critical: 4 } },
  { nameEn: "Electricity Department (Vidyut Vibhag)", nameHi: "विद्युत विभाग", code: "ELEC",
    descriptionEn: "Power outages, faulty meters, transformer issues.",
    descriptionHi: "बिजली कटौती, खराब मीटर, ट्रांसफार्मर संबंधी समस्याएं।",
    slaHours: { low: 168, medium: 72, high: 24, critical: 12 } },
  { nameEn: "Water Supply (Jal Nigam)", nameHi: "जल निगम", code: "WATER",
    descriptionEn: "Water supply disruption, contamination, pipeline leaks.",
    descriptionHi: "जल आपूर्ति बाधा, संदूषण, पाइपलाइन रिसाव।",
    slaHours: { low: 168, medium: 72, high: 24, critical: 12 } },
  { nameEn: "Municipal Corporation (Nagar Nigam)", nameHi: "नगर निगम", code: "MUNICIPAL",
    descriptionEn: "Roads, sanitation, streetlights, garbage collection.",
    descriptionHi: "सड़कें, स्वच्छता, स्ट्रीट लाइट, कूड़ा संग्रहण।",
    slaHours: { low: 240, medium: 96, high: 48, critical: 24 } },
  { nameEn: "Health Department (Swasthya Vibhag)", nameHi: "स्वास्थ्य विभाग", code: "HEALTH",
    descriptionEn: "Hospital negligence, ambulance delay, public health hazards.",
    descriptionHi: "अस्पताल लापरवाही, एम्बुलेंस देरी, सार्वजनिक स्वास्थ्य खतरे।",
    slaHours: { low: 168, medium: 48, high: 12, critical: 2 } },
  { nameEn: "Public Works Department (Lok Nirman Vibhag)", nameHi: "लोक निर्माण विभाग", code: "PWD",
    descriptionEn: "Road damage, bridges, government building maintenance.",
    descriptionHi: "सड़क क्षति, पुल, सरकारी भवन रखरखाव।",
    slaHours: { low: 240, medium: 120, high: 48, critical: 24 } },
  { nameEn: "Education Department (Shiksha Vibhag)", nameHi: "शिक्षा विभाग", code: "EDUCATION",
    descriptionEn: "School infrastructure, teacher absenteeism, scholarship issues.",
    descriptionHi: "विद्यालय अवसंरचना, शिक्षक अनुपस्थिति, छात्रवृत्ति समस्याएं।",
    slaHours: { low: 240, medium: 96, high: 48, critical: 24 } },
  { nameEn: "Revenue Department (Rajasva Vibhag)", nameHi: "राजस्व विभाग", code: "REVENUE",
    descriptionEn: "Land records, property disputes, mutation delays.",
    descriptionHi: "भूमि अभिलेख, संपत्ति विवाद, दाखिल-खारिज में देरी।",
    slaHours: { low: 336, medium: 168, high: 72, critical: 48 } },
  { nameEn: "Transport Department (Parivahan Vibhag)", nameHi: "परिवहन विभाग", code: "TRANSPORT",
    descriptionEn: "Licensing issues, illegal transport operations, road safety.",
    descriptionHi: "लाइसेंस समस्याएं, अवैध परिवहन संचालन, सड़क सुरक्षा।",
    slaHours: { low: 168, medium: 96, high: 48, critical: 12 } },
];

// Dev/test accounts. IMPORTANT: these are for local development only —
// never seed accounts like this against a production database.
const TEST_PASSWORD = "Test@12345";

const run = async () => {
  await connectDB();

  // 1. Departments (idempotent upsert by unique code)
  const savedDepartments = {};
  for (const d of departments) {
    const dept = await Department.findOneAndUpdate({ code: d.code }, d, { upsert: true, new: true });
    savedDepartments[d.code] = dept;
  }
  console.log(`Seeded ${departments.length} departments.`);

  // 2. Super admin (kept from the original seed script, phone-login based
  // like the rest of the app — see backend/models/User.js)
  let admin = await User.findOne({ role: "admin" });
  if (!admin) {
    admin = await User.create({
      name: "State Super Admin",
      phone: "9999999999",
      email: "admin@jansuvidha.up.gov.in",
      password: "Admin@12345",
      role: "admin",
      preferredLanguage: "en",
    });
    console.log("Created default admin -> phone: 9999999999 / password: Admin@12345 (CHANGE THIS)");
  }

  // 3. Test accounts required for local dev / QA (one per role), matching
  // the credentials referenced in the project README / test plan.
  //
  // IMPORTANT: findOneAndUpdate bypasses the User model's pre("save")
  // password-hashing hook, so we hash the password ourselves here and
  // store the hash directly. (An earlier version of this script tried to
  // "fix up" the password afterwards via `user.password = X; user.save()`,
  // but Mongoose does not mark a field as modified when you reassign it
  // the exact same value it already holds — so the hashing hook never
  // fired and the password was silently left as plaintext, breaking
  // login. Hashing up front avoids that pitfall entirely.)
  const testPasswordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const testAdmin = await User.findOneAndUpdate(
    { phone: "9000000003" },
    {
      name: "Test Admin",
      phone: "9000000003",
      email: "admin@test.com",
      password: testPasswordHash,
      role: "admin",
      preferredLanguage: "en",
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const testOfficer = await User.findOneAndUpdate(
    { phone: "9000000002" },
    {
      name: "Test Officer",
      phone: "9000000002",
      email: "officer@test.com",
      password: testPasswordHash,
      role: "officer",
      department: savedDepartments.MUNICIPAL._id,
      district: "Lucknow",
      designation: "Field Officer",
      preferredLanguage: "en",
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const testCitizen = await User.findOneAndUpdate(
    { phone: "9000000001" },
    {
      name: "Test Citizen",
      phone: "9000000001",
      email: "citizen@test.com",
      password: testPasswordHash,
      role: "citizen",
      preferredLanguage: "en",
      isActive: true,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log("Seeded test accounts (all use password: Test@12345):");
  console.log("  citizen@test.com / phone 9000000001 / role: citizen");
  console.log("  officer@test.com / phone 9000000002 / role: officer");
  console.log("  admin@test.com   / phone 9000000003 / role: admin");

  // 4. Sample complaints so the officer dashboard has data immediately.
  const existingSample = await Complaint.findOne({ complainant: testCitizen._id });
  if (!existingSample) {
    const now = new Date();
    const deadline = new Date(now);
    deadline.setHours(deadline.getHours() + 72);

    const trackingId1 = await generateTrackingId();
    await Complaint.create({
      trackingId: trackingId1,
      complainant: testCitizen._id,
      isAnonymous: false,
      department: savedDepartments.MUNICIPAL._id,
      crimeType: "Garbage Collection",
      titleEn: "Garbage not collected for a week in my locality",
      descriptionEn: "Household waste has piled up on the street corner near my house for over a week.",
      district: "Lucknow",
      address: "Sample Colony, Lucknow",
      priority: "medium",
      status: "assigned",
      assignedOfficer: testOfficer._id,
      assignedAt: now,
      slaDeadline: deadline,
      notes: [{ authorName: "System", message: "Assigned to officer Test Officer" }],
    });

    const trackingId2 = await generateTrackingId();
    const deadline2 = new Date(now);
    deadline2.setHours(deadline2.getHours() + 24);
    await Complaint.create({
      trackingId: trackingId2,
      complainant: testCitizen._id,
      isAnonymous: false,
      department: savedDepartments.MUNICIPAL._id,
      crimeType: "Road Damage",
      titleEn: "Large pothole causing accidents on main road",
      descriptionEn: "A deep pothole has formed near the market and two-wheeler riders keep falling.",
      district: "Lucknow",
      address: "Market Road, Lucknow",
      priority: "high",
      status: "investigation",
      assignedOfficer: testOfficer._id,
      assignedAt: now,
      slaDeadline: deadline2,
      notes: [
        { authorName: "System", message: "Assigned to officer Test Officer" },
        { authorName: "Test Officer", message: "Site visit scheduled." },
      ],
    });

    testOfficer.totalAssigned += 2;
    await testOfficer.save();

    console.log("Seeded 2 sample complaints assigned to the test officer.");
  } else {
    console.log("Sample complaints already exist, skipping.");
  }

  console.log("Seeding complete.");
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
