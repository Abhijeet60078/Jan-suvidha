import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import path from "path";
import multer from "multer";
import { Server } from "socket.io";

import connectDB from "./config/db.js";
import { startSLACron } from "./utils/slaCron.js";

import authRoutes from "./routes/authRoutes.js";
import complaintRoutes from "./routes/complaintRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json({ limit: "10mb" }));

// Serves complaint/resolution photos when Cloudinary isn't configured
// (see backend/middleware/upload.js) — no-op if Cloudinary is in use,
// since nothing gets written to this folder in that case.
app.use("/uploads", express.static(path.resolve("uploads")));

// Attach io to req so controllers can emit real-time events if needed
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || "*" } });
app.set("io", io);

io.on("connection", (socket) => {
  socket.on("join", (userId) => socket.join(userId));
});

app.get("/api/health", (req, res) => res.json({ status: "ok", service: "Jan Suvidha API" }));

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/public", publicRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof multer.MulterError || err.message === "Only JPG, PNG, or WEBP images are allowed") {
    return res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? "Each image must be 5 MB or smaller" : err.message });
  }
  res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Jan Suvidha API running on port ${PORT}`);
  startSLACron(io);
});
