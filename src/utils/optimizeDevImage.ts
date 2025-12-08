/**
 * Optimizes developer-provided images (icons + banners)
 * 
 * For production: Let Next.js Image handle all URLs directly for proper optimization.
 * Next.js Image component automatically:
 * - Converts PNG/JPG to WebP format when browser supports it
 * - Serves optimized images via /_next/image endpoint
 * - Caches optimized images for 1 year
 * - Serves /uploads files directly from public folder (for local dev)
 * - Optimizes Vercel Blob URLs directly (external HTTPS URLs)
 * 
 * @param url - The original image URL from developer (can be local path, Vercel Blob URL, or external URL)
 * @param quality - Quality parameter (unused, kept for compatibility)
 * @returns URL that Next.js Image can optimize directly
 */
export function optimizeDevImage(url?: string | null, quality: number = 80): string {
  if (!url) return "/placeholder.svg";

  // All local paths (including /uploads) should be returned as-is
  // Next.js will serve them directly from the public folder and optimize them
  // Note: In production, uploaded files are stored in Vercel Blob and return HTTPS URLs
  if (url.startsWith("/")) {
    return url;
  }

  // External URLs (including Vercel Blob URLs): Return as-is so Next.js Image can optimize them directly
  // Vercel Blob URLs look like: https://xxx.public.blob.vercel-storage.com/...
  // Next.js will handle these through remotePatterns config in next.config.js
  return url;
}

/**
 * Optimizes banner/header images with higher quality
 */
export function optimizeBannerImage(url?: string | null, quality: number = 85): string {
  return optimizeDevImage(url, quality);
}

