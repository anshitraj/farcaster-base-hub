/**
 * Optimizes developer-provided images (icons + banners)
 * 
 * For production: Routes /uploads paths through /api/icon for proper fallback handling.
 * Note: API routes like /api/icon cannot be optimized by Next.js Image, so they need unoptimized={true}
 * 
 * @param url - The original image URL from developer (can be local path, Vercel Blob URL, or external URL)
 * @param quality - Quality parameter (unused, kept for compatibility)
 * @returns URL that can be used with Next.js Image component
 */

// Track logged legacy paths to avoid console spam
const loggedLegacyPaths = new Set<string>();

export function optimizeDevImage(url?: string | null, quality: number = 80): string {
  if (!url) {
    console.warn(`[optimizeDevImage] Empty URL provided, returning placeholder`);
    return "/placeholder.svg";
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return "/placeholder.svg";
  }

  let normalizedUrl = trimmedUrl;
  if (!normalizedUrl.startsWith("/") && normalizedUrl.startsWith("uploads/")) {
    normalizedUrl = `/${normalizedUrl}`;
  }

  // /uploads paths don't exist in production (gitignored)
  // Return the URL as-is and let the Image component's onError handle the fallback
  // This allows the browser to attempt loading but fail gracefully to placeholder
  if (normalizedUrl.startsWith("/uploads")) {
    // Don't log in production to avoid spam
    // Only log each unique path once per session to reduce console noise
    if (process.env.NODE_ENV === "development" && !loggedLegacyPaths.has(normalizedUrl)) {
      loggedLegacyPaths.add(normalizedUrl);
      console.warn(`[optimizeDevImage] Legacy /uploads path detected: ${normalizedUrl}`);
    }
    // Return as-is, the Image component will handle the error
    return normalizedUrl;
  }

  // Other local paths (static assets) should be returned as-is
  // Next.js will serve them directly from the public folder and optimize them
  if (normalizedUrl.startsWith("/")) {
    return normalizedUrl;
  }

  // External URLs (including Vercel Blob URLs): Return as-is so Next.js Image can optimize them directly
  // Vercel Blob URLs look like: https://xxx.public.blob.vercel-storage.com/...
  // Next.js will handle these through remotePatterns config in next.config.js
  return normalizedUrl;
}

/**
 * Checks if a URL requires unoptimized handling (API routes)
 * Next.js Image cannot optimize API routes, so they need unoptimized={true}
 */
export function needsUnoptimized(url?: string | null): boolean {
  if (!url) return false;
  // API routes cannot be optimized by Next.js Image
  return url.startsWith("/api/");
}

/**
 * Optimizes banner/header images with higher quality
 */
export function optimizeBannerImage(url?: string | null, quality: number = 85): string {
  return optimizeDevImage(url, quality);
}

/**
 * Converts Cast Your App badge PNG URLs to WebP for frontend display
 * Metadata and database should use PNG, but frontend displays WebP
 * Also converts castapp.webp to castyourapptransparent.webp
 */
export function convertBadgeImageToWebP(url?: string | null): string {
  if (!url) {
    return "/placeholder.svg";
  }

  // Convert castapp.webp to castyourapptransparent.webp
  if (url.includes("castapp.webp")) {
    return url.replace("castapp.webp", "castyourapptransparent.webp");
  }

  // Convert cast badge PNG to WebP for frontend display
  // Handle both local paths and full URLs (including blob URLs)
  if (url.includes("castyourapptransparent.png")) {
    return url.replace("castyourapptransparent.png", "castyourapptransparent.webp");
  }

  // If it's already WebP or not a cast badge, return as-is
  return url;
}

