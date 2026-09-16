import fs from "fs";
import path from "path";
import multer from "multer";
import cloudinary, { isCloudinaryConfigured } from "../config/cloudinary.js";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/pdf"];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, WEBP, MP4, WEBM, or PDF files are allowed"));
  }
  cb(null, true);
};

const localUploadsDir = path.resolve("uploads", "complaints");
fs.mkdirSync(localUploadsDir, { recursive: true });

// NOTE: the project's package.json originally listed
// "multer-storage-cloudinary": "^4.0.0" alongside "cloudinary": "^2.4.0" —
// but multer-storage-cloudinary has never published a version compatible
// with the Cloudinary v2 SDK (its peer dependency is pinned to
// cloudinary@^1.21.0), so `npm install` fails with an unresolvable peer
// conflict out of the box. Rather than downgrade Cloudinary to v1 (a
// bigger, riskier change), this uses multer's built-in memoryStorage and
// uploads buffers directly via the v2 SDK's uploader.upload_stream — no
// bridge package needed. You can safely remove "multer-storage-cloudinary"
// from backend/package.json.
const storage = isCloudinaryConfigured
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => cb(null, localUploadsDir),
      filename: (req, file, cb) => {
        const ext = path.extname(file.originalname) || ".jpg";
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, unique);
      },
    });

export const uploadComplaintImages = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 3 },
});

const uploadBufferToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "jan-suvidha/complaints", resource_type: "auto", transformation: [{ width: 1600, height: 1600, crop: "limit" }] },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });

// Run this middleware AFTER uploadComplaintImages.array(...) whenever
// Cloudinary is configured, so in-memory file buffers actually get pushed
// to Cloudinary before the controller runs. It's a no-op (and safe to
// leave in the chain) when using local disk storage.
export const pushToCloudinaryIfConfigured = async (req, res, next) => {
  if (!isCloudinaryConfigured || !req.files?.length) return next();
  try {
    const uploaded = await Promise.all(
      req.files.map((f) => uploadBufferToCloudinary(f.buffer))
    );
    req.files = req.files.map((f, i) => ({ ...f, path: uploaded[i].secure_url }));
    next();
  } catch (err) {
    res.status(500).json({ message: "Failed to upload attachment(s)", error: err.message });
  }
};

// Turns whatever multer (+ pushToCloudinaryIfConfigured) put on req.files
// into the { url, uploadedAt } shape the Complaint model expects, regardless
// of which storage backend was used.
export const filesToAttachments = (files = []) =>
  files.map((f) => ({
    url: isCloudinaryConfigured ? f.path : `/uploads/complaints/${f.filename}`,
    resourceType: f.mimetype.startsWith("video/") ? "video" : f.mimetype === "application/pdf" ? "raw" : "image",
    originalName: f.originalname,
    uploadedAt: new Date(),
  }));
