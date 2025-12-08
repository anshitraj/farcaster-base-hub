/**
 * Image Optimization Utilities
 * Converts PNG/JPG to WebP format for better performance
 */

import sharp from "sharp";

/**
 * Converts an image buffer to WebP format
 * @param buffer - Image buffer (PNG, JPG, etc.)
 * @param quality - WebP quality (1-100, default: 75)
 * @returns Optimized WebP buffer
 */
export async function convertToWebP(
  buffer: Buffer,
  quality: number = 75
): Promise<Buffer> {
  try {
    // Check if already WebP
    const metadata = await sharp(buffer).metadata();
    if (metadata.format === "webp") {
      return buffer; // Already WebP, return as-is
    }

    // Convert to WebP
    const webpBuffer = await sharp(buffer)
      .webp({ quality, effort: 4 }) // effort 4 = good balance of speed/quality
      .toBuffer();

    return webpBuffer;
  } catch (error: any) {
    throw new Error(`Failed to convert image to WebP: ${error.message}`);
  }
}

/**
 * Converts an image URL to WebP format
 * Downloads the image, converts it, and returns optimized WebP buffer
 * Returns null if conversion fails (image inaccessible, invalid format, etc.)
 */
export async function convertImageUrlToWebP(
  imageUrl: string,
  quality: number = 75
): Promise<Buffer | null> {
  try {
    // Skip local files that are already WebP
    if (imageUrl.startsWith("/uploads/") && imageUrl.endsWith(".webp")) {
      return null; // Already WebP, no conversion needed
    }

    // Fetch the image
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ImageOptimizer/1.0)",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      // Image inaccessible - return null to indicate failure
      return null;
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      // Not an image
      return null;
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    
    // Check if buffer is empty
    if (imageBuffer.length === 0) {
      return null;
    }

    return await convertToWebP(imageBuffer, quality);
  } catch (error) {
    // Any error means conversion failed
    return null;
  }
}

/**
 * Checks if an image URL is PNG or JPG that should be converted
 */
export function shouldConvertToWebP(imageUrl: string): boolean {
  if (!imageUrl) return false;
  
  const url = imageUrl.toLowerCase();
  const isPng = url.includes(".png") || url.includes("image/png");
  const isJpg = url.includes(".jpg") || url.includes(".jpeg") || url.includes("image/jpeg");
  const isAlreadyWebP = url.includes(".webp") || url.includes("image/webp");
  
  return (isPng || isJpg) && !isAlreadyWebP;
}

/**
 * Gets optimized image URL - converts to WebP if needed
 * Returns the optimized URL or original if conversion fails
 */
export async function getOptimizedImageUrl(
  imageUrl: string,
  quality: number = 75
): Promise<string> {
  if (!imageUrl) return "/placeholder-icon.png";
  
  // Skip conversion for local/static assets
  if (
    imageUrl.startsWith("/") ||
    imageUrl.includes("placeholder") ||
    imageUrl.includes("data:image")
  ) {
    return imageUrl;
  }

  // If already WebP, return as-is
  if (imageUrl.toLowerCase().includes(".webp")) {
    return imageUrl;
  }

  // For external images, Next.js Image component will handle optimization
  // We'll use an API route to serve optimized versions
  if (shouldConvertToWebP(imageUrl)) {
    // Return API route URL that will convert on-the-fly
    const encodedUrl = encodeURIComponent(imageUrl);
    return `/api/image/optimize?url=${encodedUrl}&quality=${quality}`;
  }

  return imageUrl;
}

/**
 * Converts an image URL to WebP and saves it to Vercel Blob Storage
 * Returns the new Vercel Blob URL
 */
export async function convertAndSaveImage(
  imageUrl: string,
  subfolder: "icons" | "headers" | "screenshots" | "avatars",
  filenamePrefix: string
): Promise<string | null> {
  try {
    const { put } = await import("@vercel/blob");
    const { v4: uuidv4 } = await import("uuid");

    // Check if already WebP
    if (imageUrl.toLowerCase().endsWith(".webp")) {
      return imageUrl; // Already WebP, return as-is
    }

    // Check if PNG/JPG
    const isPngJpg = imageUrl.toLowerCase().endsWith(".png") ||
                     imageUrl.toLowerCase().endsWith(".jpg") ||
                     imageUrl.toLowerCase().endsWith(".jpeg");

    if (!isPngJpg) {
      return imageUrl; // Not PNG/JPG, return as-is
    }

    // Fetch image
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ImageConverter/1.0)",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`Failed to fetch image: ${imageUrl}`);
      return imageUrl; // Return original on failure
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const webpBuffer = await convertToWebP(buffer, 75);

    // Upload to Vercel Blob Storage
    const filename = `${filenamePrefix}-${uuidv4()}.webp`;
    const blobPath = `uploads/${subfolder}/${filename}`;
    
    const blob = await put(blobPath, webpBuffer, {
      access: "public",
      contentType: "image/webp",
    });

    return blob.url; // Return Vercel Blob URL
  } catch (error: any) {
    console.error(`Error converting and saving image: ${imageUrl}`, error);
    return imageUrl; // Return original on failure
  }
}

/**
 * Creates a tiny placeholder for blur effect
 */
export function getBlurPlaceholder(): string {
  // Base64 encoded 1x1 transparent pixel
  return "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMxMjEyMTIiLz48L3N2Zz4=";
}

