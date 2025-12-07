/**
 * Optimizes developer-provided images (icons + banners)
 * 
 * NOTE: ImageKit optimization is disabled. Next.js Image component automatically:
 * - Converts PNG/JPG to WebP format when browser supports it
 * - Serves optimized images via /_next/image endpoint
 * - Caches optimized images for 1 year
 * 
 * This function now returns the URL as-is for compatibility with existing code.
 * All Image components should use Next.js Image with proper optimization props.
 * 
 * @param url - The original image URL from developer
 * @param quality - Quality parameter (unused, kept for compatibility)
 * @returns Original URL (Next.js handles optimization automatically)
 */
export function optimizeDevImage(url?: string | null, quality: number = 80): string {
  if (!url) return "/placeholder.svg";

  // Skip optimization for:
  // - Local/static assets (already WebP or optimized)
  // - Already optimized ImageKit URLs
  // - Data URIs
  // - Placeholder images
  if (
    url.startsWith("/") ||
    url.includes("ik.imagekit.io") ||
    url.includes("webp") ||
    url.includes("data:image") ||
    url.includes("placeholder") ||
    url.includes("fallback")
  ) {
    return url;
  }

  // ImageKit optimization DISABLED - causing 403/404 errors and slow loads
  // Using direct URLs for better performance and reliability
  // Next.js Image component will handle optimization automatically
  return url;
  
  // OLD ImageKit code (disabled due to reliability issues):
  // const imageKitId = "95ygcdrwvh";
  // const encoded = encodeURIComponent(url);
  // return `https://ik.imagekit.io/${imageKitId}/tr:f-webp,q-${quality}/${encoded}`;
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

