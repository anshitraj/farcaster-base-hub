/**
 * Optimizes developer-provided images (icons + banners)
 * 
 * For production: Routes /uploads paths through /api/icon for proper fallback handling.
 * Next.js Image component automatically:
 * - Converts PNG/JPG to WebP format when browser supports it
 * - Serves optimized images via /_next/image endpoint
 * - Caches optimized images for 1 year
 * - Routes /uploads through /api/icon to handle missing files gracefully
 * - Optimizes Vercel Blob URLs directly (external HTTPS URLs)
 * 
 * @param url - The original image URL from developer (can be local path, Vercel Blob URL, or external URL)
 * @param quality - Quality parameter (unused, kept for compatibility)
 * @returns URL that Next.js Image can optimize directly
 */
export function optimizeDevImage(url?: string | null, quality: number = 80): string {
  if (!url) return "/placeholder.svg";

  // Route /uploads paths through /api/icon for proper fallback handling
  // In production, /uploads files don't exist in the filesystem, so we need a fallback
  // /api/icon will return a placeholder if the file doesn't exist
  if (url.startsWith("/uploads")) {
    return `/api/icon?url=${encodeURIComponent(url)}`;
  }

  // Other local paths (static assets) should be returned as-is
  // Next.js will serve them directly from the public folder and optimize them
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

