/**
 * Optimizes developer-provided images (icons + banners)
 * 
 * NOTE: ImageKit optimization is disabled. Next.js Image component automatically:
 * - Converts PNG/JPG to WebP format when browser supports it
 * - Serves optimized images via /_next/image endpoint
 * - Caches optimized images for 1 year
 * 
 * This function now routes images through /api/icon to handle missing files gracefully.
 * All Image components should use Next.js Image with proper optimization props.
 * 
 * @param url - The original image URL from developer
 * @param quality - Quality parameter (unused, kept for compatibility)
 * @returns URL routed through /api/icon for safe handling
 */
export function optimizeDevImage(url?: string | null, quality: number = 80): string {
  if (!url) return "/placeholder.svg";

  // Skip routing through API for:
  // - Already API routes (to prevent double routing)
  // - Placeholder/fallback images (static assets)
  // - Data URIs
  if (
    url.startsWith("/api/") ||
    url.includes("data:image") ||
    url.includes("placeholder") ||
    url.includes("fallback") ||
    url.startsWith("/verify") ||
    url.startsWith("/logo")
  ) {
    return url;
  }

  // Route ALL image URLs (local /uploads/ and external) through /api/icon
  // This prevents 404s for /uploads/ files that don't exist on Vercel
  // The /api/icon route handles missing files gracefully by returning placeholders
  return `/api/icon?url=${encodeURIComponent(url)}`;
}

/**
 * Gets the original URL from an ImageKit URL (for fallback)
 */
export function getOriginalUrlFromImageKit(imageKitUrl: string): string | null {
  try {
    // Extract the original URL from ImageKit URL format
    // Format: https://ik.imagekit.io/{id}/tr:f-webp,q-{quality}/{encoded_url}
    const match = imageKitUrl.match(/tr:f-webp,q-\d+\/(.+)$/);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
  } catch (e) {
    // If parsing fails, return null
  }
  return null;
}

/**
 * Optimizes banner/header images with higher quality
 */
export function optimizeBannerImage(url?: string | null, quality: number = 85): string {
  return optimizeDevImage(url, quality);
}

