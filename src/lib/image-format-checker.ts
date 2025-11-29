/**
 * Utility to check if images are loading as WebP
 * This can be used in development to verify WebP optimization is working
 */

/**
 * Check the format of an image by fetching it and checking Content-Type
 */
export async function checkImageFormat(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('webp')) {
      return 'webp';
    } else if (contentType?.includes('png')) {
      return 'png';
    } else if (contentType?.includes('jpeg') || contentType?.includes('jpg')) {
      return 'jpeg';
    } else if (contentType?.includes('avif')) {
      return 'avif';
    }
    
    return contentType || 'unknown';
  } catch (error) {
    console.error('Error checking image format:', error);
    return null;
  }
}

/**
 * Log all image formats on the page
 * Call this in browser console: window.checkImageFormats()
 */
export function logImageFormats() {
  if (typeof window === 'undefined') return;
  
  const images = document.querySelectorAll('img');
  console.log(`Found ${images.length} images on the page`);
  
  images.forEach((img, index) => {
    const src = img.getAttribute('src') || img.getAttribute('srcset') || '';
    const isNextImage = src.includes('/_next/image');
    
    console.log(`Image ${index + 1}:`, {
      src: src.substring(0, 100) + (src.length > 100 ? '...' : ''),
      isNextImageOptimized: isNextImage,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
    });
    
    // Check actual format via fetch
    if (src && !src.startsWith('data:')) {
      checkImageFormat(src).then(format => {
        console.log(`  → Format: ${format}`);
      });
    }
  });
}

/**
 * Monitor network requests to see image formats
 * This will log all image requests and their formats
 */
export function monitorImageFormats() {
  if (typeof window === 'undefined') return;
  
  // Override fetch to intercept image requests
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    const response = await originalFetch(...args);
    
    const url = args[0]?.toString() || '';
    if (url.includes('/_next/image') || url.match(/\.(png|jpg|jpeg|webp|avif)/i)) {
      const contentType = response.headers.get('content-type');
      console.log('🖼️ Image Request:', {
        url: url.substring(0, 100),
        format: contentType,
        isWebP: contentType?.includes('webp'),
        isAVIF: contentType?.includes('avif'),
      });
    }
    
    return response;
  };
  
  console.log('✅ Image format monitoring enabled. Check console for image requests.');
}

