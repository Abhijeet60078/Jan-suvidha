import express from "express";
import Notification from "../models/Notification.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// @desc Logged-in user's notifications, newest first
router.get("/mine", protect, async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50);
  const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });
  res.json({ notifications, unreadCount });
});

// @desc Mark a single notification as read
router.patch("/:id/read", protect, async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!notification) return res.status(404).json({ message: "Notification not found" });
  notification.isRead = true;
  await notification.save();
  res.json({ notification });
});

export default router;
