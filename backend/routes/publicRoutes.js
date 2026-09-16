import express from "express";
import Complaint from "../models/Complaint.js";

const router = express.Router();

// Simple module-level cache — avoids hitting the DB on every homepage load.
// A dedicated cache layer (Redis etc.) would be overkill for a read this
// cheap and this tolerant of a few minutes' staleness.
let cache = { data: null, expiresAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000;

// @desc Public, state-wide transparency stats — no auth required, no
// personal data returned (counts and averages only).
router.get("/stats", async (req, res) => {
  if (cache.data && cache.expiresAt > Date.now()) {
    return res.json(cache.data);
  }

  const [totalComplaints, totalResolved, avgResolutionAgg, byDepartment] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.countDocuments({ status: { $in: ["resolved", "closed"] } }),
    Complaint.aggregate([
      { $match: { resolvedAt: { $ne: null } } },
      {
        $project: {
          resolutionDays: {
            $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      { $group: { _id: null, avgDays: { $avg: "$resolutionDays" } } },
    ]),
    Complaint.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } },
      { $lookup: { from: "departments", localField: "_id", foreignField: "_id", as: "dept" } },
      { $unwind: "$dept" },
      { $project: { _id: 0, department: "$dept.nameEn", departmentHi: "$dept.nameHi", count: 1 } },
      { $sort: { count: -1 } },
    ]),
  ]);

  const data = {
    totalComplaints,
    totalResolved,
    averageResolutionDays: avgResolutionAgg[0]?.avgDays
      ? Math.round(avgResolutionAgg[0].avgDays * 10) / 10
      : null,
    byDepartment,
  };

  cache = { data, expiresAt: Date.now() + CACHE_TTL_MS };
  res.json(data);
});

export default router;
