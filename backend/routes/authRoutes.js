import express from "express";
import { registerCitizen, login, getMe, createStaffAccount, requestOtp, verifyPhone, loginWithOtp, resetPassword } from "../controllers/authController.js";
import { protect, authorize } from "../middleware/auth.js";
import { loginRateLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", registerCitizen);
router.post("/login", loginRateLimiter, login);
router.post("/otp/request", requestOtp);
router.post("/otp/login", loginWithOtp);
router.post("/otp/verify-phone", verifyPhone);
router.post("/password/reset", resetPassword);
router.get("/me", protect, getMe);
router.post("/staff", protect, authorize("admin"), createStaffAccount);

export default router;
