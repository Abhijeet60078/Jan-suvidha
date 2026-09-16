import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import { consumeOtp, issueOtp } from "../utils/otp.js";

// @desc Register a citizen (public) — officers/admins are created by admin only
export const registerCitizen = async (req, res) => {
  try {
    const { name, phone, email, password, preferredLanguage } = req.body;

    if (!name || !phone || !password) {
      return res.status(400).json({ message: "Name, phone and password are required" });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ message: "An account with this phone number already exists" });
    }

    const user = await User.create({
      name,
      phone,
      email,
      password,
      preferredLanguage: preferredLanguage || "hi",
      role: "citizen",
    });

    res.status(201).json({
      user: user.toSafeObject(),
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
};

// @desc Login for all roles
export const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (user?.lockUntil && user.lockUntil > new Date()) return res.status(423).json({ message: "Account temporarily locked. Try again later." });
    if (!user || !(await user.comparePassword(password))) {
      if (user) { user.failedLoginAttempts += 1; if (user.failedLoginAttempts >= 5) user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); await user.save(); }
      return res.status(401).json({ message: "Invalid phone number or password" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "This account has been deactivated" });
    }
    if (user.role === "admin" && user.twoFactorEnabled) {
      const devCode = await issueOtp(phone, "login");
      return res.json({ requiresTwoFactor: true, phone, ...(devCode ? { devCode } : {}) });
    }
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    res.json({
      user: user.toSafeObject(),
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
};

export const requestOtp = async (req, res) => {
  const { phone, purpose = "login" } = req.body;
  if (!phone || !["login", "verify_phone", "reset_password"].includes(purpose)) {
    return res.status(400).json({ message: "Phone and a valid OTP purpose are required" });
  }
  const user = await User.findOne({ phone });
  if (purpose === "login" && (!user || !user.isActive)) return res.status(404).json({ message: "Active account not found" });
  if (purpose === "verify_phone" && !user) return res.status(404).json({ message: "Account not found" });
  if (purpose === "reset_password" && !user) return res.status(404).json({ message: "Account not found" });
  const devCode = await issueOtp(phone, purpose);
  res.json({ message: "OTP sent to your mobile number", ...(devCode ? { devCode } : {}) });
};

export const verifyPhone = async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code || !(await consumeOtp(phone, "verify_phone", code))) return res.status(400).json({ message: "Invalid or expired OTP" });
  const user = await User.findOneAndUpdate({ phone }, { phoneVerified: true }, { new: true });
  res.json({ user: user.toSafeObject(), message: "Phone number verified" });
};

export const loginWithOtp = async (req, res) => {
  const { phone, code } = req.body;
  const user = await User.findOne({ phone });
  if (!user || !user.isActive || !(await consumeOtp(phone, "login", code))) return res.status(401).json({ message: "Invalid or expired OTP" });
  user.phoneVerified = true;
  await user.save();
  res.json({ user: user.toSafeObject(), token: generateToken(user._id) });
};

export const resetPassword = async (req, res) => {
  const { phone, code, password } = req.body;
  if (!phone || !code || !password || password.length < 6) return res.status(400).json({ message: "Phone, OTP and a password of at least 6 characters are required" });
  if (!(await consumeOtp(phone, "reset_password", code))) return res.status(400).json({ message: "Invalid or expired OTP" });
  const user = await User.findOne({ phone });
  if (!user) return res.status(404).json({ message: "Account not found" });
  user.password = password;
  user.phoneVerified = true;
  await user.save();
  res.json({ message: "Password reset successfully" });
};

// @desc Get current logged-in user
export const getMe = async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
};

// @desc Admin creates officer / departmentHead / admin accounts
export const createStaffAccount = async (req, res) => {
  try {
    const { name, phone, email, password, role, department, district, designation } = req.body;

    if (!["officer", "departmentHead", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid staff role" });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(409).json({ message: "An account with this phone number already exists" });
    }

    const user = await User.create({
      name,
      phone,
      email,
      password,
      role,
      department,
      district,
      designation,
      preferredLanguage: "hi",
    });

    res.status(201).json({ user: user.toSafeObject() });
  } catch (err) {
    res.status(500).json({ message: "Failed to create staff account", error: err.message });
  }
};
