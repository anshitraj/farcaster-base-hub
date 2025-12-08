/**
 * Optimizes developer-provided images (icons + banners)
 * 
 * For production: Let Next.js Image handle external URLs directly for proper optimization.
 * Only use /api/icon as fallback for missing local files.
 * 
 * Next.js Image component automatically:
 * - Converts PNG/JPG to WebP format when browser supports it
 * - Serves optimized images via /_next/image endpoint
 * - Caches optimized images for 1 year
 * 
 * @param url - The original image URL from developer
 * @param quality - Quality parameter (unused, kept for compatibility)
 * @returns URL that Next.js Image can optimize directly
 */
export function optimizeDevImage(url?: string | null, quality: number = 80): string {
  if (!url) return "/placeholder.svg";

  // Local static assets should be returned as-is (they exist in public folder)
  if (url.startsWith("/") && !url.startsWith("/uploads")) {
    return url;
  }

  // For production: Let Next.js Image handle external URLs directly
  // This allows proper optimization through /_next/image endpoint
  // Only route through /api/icon for /uploads paths that might not exist
  if (url.startsWith("/uploads")) {
    // Use /api/icon as fallback for potentially missing upload files
    return `/api/icon?url=${encodeURIComponent(url)}`;
  }

  // External URLs: Return as-is so Next.js Image can optimize them directly
  // Next.js will handle these through remotePatterns config
  return url;
}

/**
 * Optimizes banner/header images with higher quality
 */
export function optimizeBannerImage(url?: string | null, quality: number = 85): string {
  return optimizeDevImage(url, quality);
}

