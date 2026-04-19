import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// FINAL upload folder (relative to project root): ./public/tempImages
export const UPLOAD_DIR = path.join(
  __dirname,
  "..",
  "..",
  "public",
  "tempImages"
);

// ensure dir exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// diskStorage (we need req.file.path later)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const prefix = Date.now();
    cb(null, `${prefix}-${file.originalname}`);
  },
});

// only allow images and limit size (adjust size as needed)
const fileFilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/"))
    return cb(null, true);
  cb(new Error("Only image files are allowed."));
};

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter,
});
