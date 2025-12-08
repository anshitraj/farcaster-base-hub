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
export function optimizeDevImage(url?: string | null, quality: number = 80): string {
  if (!url) {
    console.warn(`[optimizeDevImage] Empty URL provided, returning placeholder`);
    return "/placeholder.svg";
  }

  // Route /uploads paths through /api/icon for proper fallback handling
  // In production, /uploads files don't exist in the filesystem, so we need a fallback
  // /api/icon will return a placeholder if the file doesn't exist
  // NOTE: API routes must use unoptimized={true} because Next.js Image can't optimize them
  if (url.startsWith("/uploads")) {
    const apiUrl = `/api/icon?url=${encodeURIComponent(url)}`;
    console.log(`[optimizeDevImage] Routing /uploads path through API: ${url} -> ${apiUrl}`);
    return apiUrl;
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

