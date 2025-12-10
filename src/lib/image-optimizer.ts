/**
 * Image optimization utility for social feed images
 * Converts images to WebP and uploads to Vercel Blob for fast CDN delivery
 */

// Cache for optimized URLs (prevents duplicate API calls)
const optimizationCache = new Map<string, { url: string; timestamp: number }>();
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Check if URL is already a WebP or from Vercel Blob
 */
function isAlreadyOptimized(url: string): boolean {
  return (
    url.includes('.webp') ||
    url.includes('blob.vercel-storage.com') ||
    url.includes('vercel-storage.com')
  );
}

/**
 * Get optimized image URL
 * Returns WebP version from Vercel Blob if available, otherwise returns original
 */
export async function getOptimizedImageUrl(
  originalUrl: string | null | undefined
): Promise<string | null> {
  if (!originalUrl) return null;

  // Skip if already optimized
  if (isAlreadyOptimized(originalUrl)) {
    return originalUrl;
  }

  // Check cache
  const cached = optimizationCache.get(originalUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.url;
  }

  try {
    // Call optimization API
    const response = await fetch(
      `/api/optimize-image?url=${encodeURIComponent(originalUrl)}`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.optimizedUrl && !data.fallback) {
        // Cache the result only if it's actually optimized
        optimizationCache.set(originalUrl, {
          url: data.optimizedUrl,
          timestamp: Date.now(),
        });
        return data.optimizedUrl;
      }
      // If fallback, return original URL
      if (data.fallback) {
        return originalUrl;
      }
    }
  } catch (error) {
    console.error("Error optimizing image:", error);
  }

  // Fallback to original URL
  return originalUrl;
}

/**
 * Preload optimized images for better performance
 */
export function preloadOptimizedImage(url: string | null | undefined) {
  if (!url) return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
}

