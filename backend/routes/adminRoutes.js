import express from "express";
import {
  getOverview, getOfficerLeaderboard, getOfficerPerformanceLog,
  adjustOfficerRating, listDepartments, upsertDepartment, setDepartmentActive,
  getAllComplaints, adminAssignComplaint, changeComplaintPriority,
  listOfficers, updateOfficer, setOfficerActive, getAnalytics, exportAnalytics, getAuditLogs, setAdminTwoFactor,
} from "../controllers/adminController.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/overview", protect, authorize("admin", "departmentHead"), getOverview);
router.get("/analytics", protect, authorize("admin", "departmentHead"), getAnalytics);
router.get("/analytics/export", protect, authorize("admin", "departmentHead"), exportAnalytics);
router.get("/audit-logs", protect, authorize("admin"), getAuditLogs);
router.patch("/security/2fa", protect, authorize("admin"), setAdminTwoFactor);

// Officer management & accountability
router.get("/officers", protect, authorize("admin", "departmentHead"), listOfficers);
router.put("/officers/:officerId", protect, authorize("admin"), updateOfficer);
router.patch("/officers/:officerId/active", protect, authorize("admin"), setOfficerActive);
router.get("/officers/leaderboard", protect, authorize("admin", "departmentHead"), getOfficerLeaderboard);
router.get("/officers/:officerId/logs", protect, authorize("admin", "departmentHead"), getOfficerPerformanceLog);
router.patch("/officers/:officerId/rating", protect, authorize("admin"), adjustOfficerRating);
// Officer *creation* reuses the existing POST /api/auth/staff endpoint
// (authController.createStaffAccount), which already handles all staff
// roles (officer/departmentHead/admin) with password hashing — no need
// to duplicate that logic here.

// Complaint management (state-wide, not department-scoped)
router.get("/complaints", protect, authorize("admin", "departmentHead"), getAllComplaints);
router.patch("/complaints/:id/assign", protect, authorize("admin", "departmentHead"), adminAssignComplaint);
router.patch("/complaints/:id/priority", protect, authorize("admin", "departmentHead"), changeComplaintPriority);

// Department management
router.get("/departments", listDepartments); // public - needed for complaint filing dropdown
router.post("/departments", protect, authorize("admin"), upsertDepartment);
router.patch("/departments/:id/active", protect, authorize("admin"), setDepartmentActive);

export default router;
