/**
 * Simple image processing utilities for cover art uploads
 * No client-side resizing - just validation and filename sanitization
 */

/**
 * Sanitize filename for storage
 * - lowercase
 * - replace spaces with dashes
 * - remove special characters
 * - limit length
 */
export function sanitizeFilename(filename: string, maxLength = 60): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
  const name = filename.replace(/\.[^/.]+$/, ""); // Remove extension
  
  const sanitized = name
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, "") // Remove special characters
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, "") // Trim leading/trailing hyphens
    .slice(0, maxLength - ext.length - 1); // Leave room for extension
  
  return `${sanitized || "cover"}.${ext}`;
}

/**
 * Validate cover image file
 * Returns null if valid, error message if invalid
 */
export function validateCoverImage(file: File): string | null {
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  // Align with storage bucket constraints (10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB

  // Check type by MIME or extension
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

/**
 * Get proper content type for image upload
 */
export function getImageContentType(file: File): string {
  const type = file.type.toLowerCase();
  
  if (type === "image/jpeg" || type === "image/jpg") return "image/jpeg";
  if (type === "image/png") return "image/png";
  if (type === "image/webp") return "image/webp";
  
  // Fallback based on extension
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  
  return "image/jpeg"; // Default fallback
}
