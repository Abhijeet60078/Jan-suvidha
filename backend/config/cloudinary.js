import { v2 as cloudinary } from "cloudinary";

// Cloud storage is optional. If all three CLOUDINARY_* vars are present in
// .env, uploaded photos go to Cloudinary. Otherwise middleware/upload.js
// falls back to local disk storage under backend/uploads/ — so the app
// works with zero extra config out of the box.
export const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export default cloudinary;
