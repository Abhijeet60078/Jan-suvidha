import express from "express";
import {
  fileComplaint, getMyComplaints, getComplaintById, trackByTrackingId, getAssignedComplaints,
  getDepartmentComplaints, assignComplaint, updateComplaintStatus,
  rateComplaint, escalateComplaint, reopenComplaint, uploadEvidence, bulkUpdateComplaintStatus,
} from "../controllers/complaintController.js";
import { protect, authorize } from "../middleware/auth.js";
import { uploadComplaintImages, pushToCloudinaryIfConfigured } from "../middleware/upload.js";
import { complaintFilingLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.get("/track/:trackingId", trackByTrackingId); // public

router.post(
  "/",
  protect,
  authorize("citizen"),
  complaintFilingLimiter,
  uploadComplaintImages.array("attachments", 3),
  pushToCloudinaryIfConfigured,
  fileComplaint
);
router.get("/mine", protect, authorize("citizen"), getMyComplaints);
router.post("/:id/rate", protect, authorize("citizen"), rateComplaint);
router.post("/:id/escalate", protect, authorize("citizen"), escalateComplaint);
router.post("/:id/reopen", protect, authorize("citizen"), reopenComplaint);
router.post(
  "/:id/evidence",
  protect,
  authorize("citizen", "officer", "departmentHead", "admin"),
  uploadComplaintImages.array("attachments", 3),
  pushToCloudinaryIfConfigured,
  uploadEvidence
);

router.get("/assigned", protect, authorize("officer"), getAssignedComplaints);
router.patch("/bulk-status", protect, authorize("officer", "departmentHead", "admin"), bulkUpdateComplaintStatus);
router.patch(
  "/:id/status",
  protect,
  authorize("officer", "departmentHead", "admin"),
  uploadComplaintImages.array("attachments", 3),
  pushToCloudinaryIfConfigured,
  updateComplaintStatus
);

router.get("/department", protect, authorize("departmentHead", "admin"), getDepartmentComplaints);
router.post("/:id/assign", protect, authorize("departmentHead", "admin"), assignComplaint);

// IMPORTANT: this generic /:id route must stay LAST among GET routes on this
// router, otherwise it would shadow /mine, /assigned, /department, /track/:trackingId.
router.get(
  "/:id",
  protect,
  authorize("citizen", "officer", "departmentHead", "admin"),
  getComplaintById
);

export default router;
