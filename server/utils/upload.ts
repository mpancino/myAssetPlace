import multer from 'multer';
import { Request } from 'express';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Create a unique filename with the original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'image-' + uniqueSuffix + ext);
  }
});

// Validate that uploaded files are images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

// Export configured multer middleware
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  }
});

// Function to generate public URL for an uploaded file
export function getFileUrl(filename: string): string {
  // In production, this would be a CDN URL or similar
  // For this development environment, we'll use a local path
  return `/uploads/${filename}`;
}

// Function to delete a file
export function deleteFile(filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const filepath = path.join(uploadsDir, path.basename(filename));
    fs.unlink(filepath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}