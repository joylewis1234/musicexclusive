/**
 * Image processing utilities for cover art uploads
 */

const MAX_FILE_SIZE = 800 * 1024; // 800 KB
const MAX_DIMENSION = 2000; // px
const TARGET_SIZE = 1500; // px for resized output
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Sanitize filename for storage
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
  
  return `${sanitized || "cover"}.${ext === "jpg" ? "jpeg" : ext}`;
}

/**
 * Get normalized content type
 */
export function normalizeContentType(file: File): string {
  const type = file.type.toLowerCase();
  
  if (type === "image/jpg") return "image/jpeg";
  if (ALLOWED_TYPES.includes(type)) return type;
  
  // Fallback based on extension
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  
  return "image/jpeg"; // Default fallback
}

/**
 * Check if image needs processing (resize/compress)
 */
export async function needsProcessing(file: File): Promise<boolean> {
  if (file.size > MAX_FILE_SIZE) return true;
  
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img.width > MAX_DIMENSION || img.height > MAX_DIMENSION);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(false);
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Resize and compress image to target size with center crop for square aspect
 */
export async function processImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        URL.revokeObjectURL(img.src);
        
        // Calculate crop dimensions for square aspect ratio (center crop)
        const size = Math.min(img.width, img.height);
        const cropX = (img.width - size) / 2;
        const cropY = (img.height - size) / 2;
        
        // Target output size
        const outputSize = Math.min(size, TARGET_SIZE);
        
        // Create canvas
        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }
        
        // Draw with center crop and resize
        ctx.drawImage(
          img,
          cropX, cropY, size, size, // Source crop
          0, 0, outputSize, outputSize // Destination
        );
        
        // Convert to blob with quality adjustment
        const tryQuality = (quality: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to create image blob"));
                return;
              }
              
              // If still too large and quality can be reduced, try again
              if (blob.size > MAX_FILE_SIZE && quality > 0.5) {
                tryQuality(quality - 0.1);
                return;
              }
              
              // Create new file with sanitized name
              const sanitizedName = sanitizeFilename(file.name);
              const processedFile = new File([blob], sanitizedName, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });
              
              console.log("[ImageProcessing] Processed image:", {
                original: { name: file.name, size: file.size, type: file.type },
                processed: { name: processedFile.name, size: processedFile.size, type: processedFile.type },
                dimensions: { original: `${img.width}x${img.height}`, output: `${outputSize}x${outputSize}` },
              });
              
              resolve(processedFile);
            },
            "image/jpeg",
            quality
          );
        };
        
        // Start with high quality
        tryQuality(0.85);
        
      } catch (err) {
        reject(err);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image for processing"));
    };
    
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Prepare cover image for upload - sanitizes filename and processes if needed
 */
export async function prepareCoverImage(file: File): Promise<{
  file: File;
  wasProcessed: boolean;
  contentType: string;
}> {
  const contentType = normalizeContentType(file);
  
  // Validate content type
  if (!ALLOWED_TYPES.includes(contentType)) {
    throw new Error(`Invalid image type: ${file.type}. Please use JPG, PNG, or WEBP.`);
  }
  
  // Check if processing is needed
  const shouldProcess = await needsProcessing(file);
  
  if (shouldProcess) {
    console.log("[ImageProcessing] Image needs processing - resizing...");
    const processedFile = await processImage(file);
    return {
      file: processedFile,
      wasProcessed: true,
      contentType: "image/jpeg", // Processed images are always JPEG
    };
  }
  
  // No processing needed - just sanitize the filename
  const sanitizedName = sanitizeFilename(file.name);
  const renamedFile = new File([file], sanitizedName, {
    type: contentType,
    lastModified: file.lastModified,
  });
  
  return {
    file: renamedFile,
    wasProcessed: false,
    contentType,
  };
}
