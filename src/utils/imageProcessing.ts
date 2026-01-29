/**
 * Image processing utilities for avatar/cover art uploads
 * Handles client-side compression, resizing, and format conversion
 */

import imageCompression from "browser-image-compression";

/**
 * Sanitize filename for storage
 */
export function sanitizeFilename(filename: string, maxLength = 60): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const name = filename.replace(/\.[^/.]+$/, "");
  
  const sanitized = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLength - ext.length - 1);
  
  return `${sanitized || "image"}.${ext}`;
}

/**
 * Validate image file before processing
 * Returns null if valid, error message if invalid
 */
export function validateImageFile(file: File): string | null {
  const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
  const maxSize = 50 * 1024 * 1024; // Allow large files since we'll compress

  const ext = file.name.split(".").pop()?.toLowerCase();
  const isValidType = validTypes.includes(file.type) || 
    ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(ext || "");

  if (!isValidType) {
    return "Invalid format. Please upload a JPG, PNG, WEBP, or HEIC image.";
  }

  if (file.size > maxSize) {
    return "Image too large. Please upload an image under 50MB.";
  }

  return null;
}

/**
 * Alias for validateImageFile for cover art (backwards compatibility)
 */
export function validateCoverImage(file: File): string | null {
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  const maxSize = 10 * 1024 * 1024; // 10MB for covers

  const ext = file.name.split(".").pop()?.toLowerCase();
  const isValidType = validTypes.includes(file.type) || 
    ["jpg", "jpeg", "png", "webp"].includes(ext || "");

  if (!isValidType) {
    return "Invalid format. Please upload a JPG, PNG, or WEBP image.";
  }

  if (file.size > maxSize) {
    return "Cover image too large. Please upload an image under 10MB.";
  }

  return null;
}

export interface ProcessedImage {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
}

/**
 * Process image for upload:
 * - Resize to max 1024x1024 (square crop)
 * - Compress to ~0.8 quality
 * - Convert to JPEG
 * - Target size under 1MB
 */
export async function processImageForUpload(file: File): Promise<ProcessedImage> {
  const originalSize = file.size;

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    fileType: "image/jpeg" as const,
    initialQuality: 0.8,
    alwaysKeepResolution: false,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    
    // Create a properly named file
    const timestamp = Date.now();
    const newFile = new File(
      [compressedFile], 
      `avatar-${timestamp}.jpg`,
      { type: "image/jpeg" }
    );

    // Generate preview URL
    const previewUrl = URL.createObjectURL(newFile);

    return {
      file: newFile,
      previewUrl,
      originalSize,
      compressedSize: newFile.size,
    };
  } catch (error) {
    console.error("[processImageForUpload] Compression failed:", error);
    throw new Error("Failed to process image. Please try a different photo.");
  }
}

/**
 * Clean up preview URL to prevent memory leaks
 */
export function revokePreviewUrl(url: string): void {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Get proper content type for image upload
 */
export function getImageContentType(file: File): string {
  const type = file.type.toLowerCase();
  
  if (type === "image/jpeg" || type === "image/jpg") return "image/jpeg";
  if (type === "image/png") return "image/png";
  if (type === "image/webp") return "image/webp";
  
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  
  return "image/jpeg";
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
