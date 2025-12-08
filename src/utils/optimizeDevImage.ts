/**
 * Optimizes developer-provided images (icons + banners)
 * 
 * Routes images through /api/icon to handle missing files gracefully.
 * Next.js Image component automatically:
 * - Converts PNG/JPG to WebP format when browser supports it
 * - Serves optimized images via /_next/image endpoint
 * - Caches optimized images for 1 year
 * 
 * All Image components should use Next.js Image with proper optimization props.
 * 
 * @param url - The original image URL from developer
 * @param quality - Quality parameter (unused, kept for compatibility)
 * @returns URL routed through /api/icon for safe handling
 */
export function optimizeDevImage(url?: string | null, quality: number = 80): string {
  if (!url) return "/placeholder.svg";

  // Local static assets should be returned as-is (they exist in public folder)
  if (url.startsWith("/") && !url.startsWith("/uploads")) {
    return url;
  }

  // External URLs or /uploads go through /api/icon
  // This prevents 404s for /uploads/ files that don't exist on Vercel
  // The /api/icon route handles missing files gracefully by returning placeholders
  return `/api/icon?url=${encodeURIComponent(url)}`;
}

/**
 * Optimizes banner/header images with higher quality
 */
export function optimizeBannerImage(url?: string | null, quality: number = 85): string {
  return optimizeDevImage(url, quality);
}

