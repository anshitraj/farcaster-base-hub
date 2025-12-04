/**
 * Optimizes developer-provided images (icons + banners) using ImageKit CDN
 * Converts PNG/JPG to WebP format for faster loading
 * 
 * IMPORTANT: ImageKit needs an origin configured to fetch external images.
 * If ImageKit returns 404, the onError handler will fall back to the original URL.
 * 
 * @param url - The original image URL from developer
 * @param quality - WebP quality (1-100), default 80
 * @returns Optimized ImageKit URL or original URL if already optimized/static
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

  // ImageKit optimization enabled
  // Using your ImageKit endpoint: https://ik.imagekit.io/95ygcdrwvh/
  // NOTE: ImageKit needs an origin configured to fetch external images
  // If you see 404 errors, configure an origin in ImageKit dashboard:
  // Settings > Origins > Add origin (or use "External URL" origin type)
  const imageKitId = "95ygcdrwvh";
  
  // Encode the URL to handle special characters
  const encoded = encodeURIComponent(url);
  
  // ImageKit transformation: convert to WebP with specified quality
  // Format: https://ik.imagekit.io/{imageKitId}/tr:f-webp,q-{quality}/{encoded_url}
  return `https://ik.imagekit.io/${imageKitId}/tr:f-webp,q-${quality}/${encoded}`;
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

