# How to Check if Images are Loading as WebP

## Quick Methods

### 1. Browser DevTools - Network Tab (Easiest)

1. Open your browser DevTools (F12 or Right-click → Inspect)
2. Go to the **Network** tab
3. Filter by **Img** (click the "Img" filter button)
4. Reload the page (F5 or Ctrl+R)
5. Look at the **Type** column - it should show `webp` for optimized images
6. Check the **Size** column - WebP files are typically 25-35% smaller than PNG

**What to look for:**
- ✅ `image/webp` in the Type column = WebP (optimized)
- ❌ `image/png` in the Type column = PNG (not optimized)
- ✅ Smaller file sizes = Better optimization

### 2. Check Response Headers

1. In the Network tab, click on any image request
2. Go to the **Headers** tab
3. Look for `Content-Type: image/webp` in the Response Headers

### 3. Browser Console Method

Open browser console (F12 → Console tab) and paste this:

```javascript
// Check all images on the page
document.querySelectorAll('img').forEach((img, i) => {
  const src = img.src || img.srcset || '';
  const isNextImage = src.includes('/_next/image');
  console.log(`Image ${i+1}:`, {
    src: src.substring(0, 60) + '...',
    isNextOptimized: isNextImage,
    format: isNextImage ? 'WebP (via Next.js)' : 'Direct URL'
  });
});

// Check actual format via network
performance.getEntriesByType('resource')
  .filter(r => r.initiatorType === 'img')
  .forEach(r => {
    console.log('Loaded image:', {
      name: r.name.substring(0, 60),
      size: (r.transferSize / 1024).toFixed(2) + ' KB'
    });
  });
```

### 4. Visual Inspection in Elements Tab

1. Right-click on any image → Inspect
2. In the Elements panel, look at the `<img>` tag
3. Check the `src` attribute:
   - If it contains `/_next/image?url=...` = Next.js optimized (will serve WebP)
   - If it's a direct URL = Not optimized

## Using the Debug Component (Development Only)

Add this to your layout or page temporarily:

```tsx
import ImageFormatDebugger from "@/components/ImageFormatDebugger";

// In your component:
<ImageFormatDebugger />
```

This will automatically log image format info to the console in development mode.

## Expected Behavior

### ✅ Working Correctly:
- Images from Base Mini App JSON (PNG) → Served as WebP by Next.js
- Smaller file sizes in Network tab
- `Content-Type: image/webp` in response headers
- URLs contain `/_next/image` for optimized images

### ❌ Not Working:
- Direct PNG URLs (not going through Next.js Image)
- `Content-Type: image/png` in headers
- Large file sizes

## Troubleshooting

If images are still loading as PNG:

1. **Check if using Next.js Image component:**
   - Make sure you're using `import Image from "next/image"` not `<img>`
   - Check that `iconUrl` and `headerImageUrl` are being passed to Image component

2. **Check Next.js config:**
   - Verify `formats: ['image/avif', 'image/webp']` is in `next.config.js`
   - Ensure `remotePatterns` allows your image domains

3. **Browser support:**
   - Modern browsers support WebP automatically
   - Next.js will fallback to PNG if browser doesn't support WebP

4. **Check Network tab:**
   - Look for requests to `/_next/image` endpoint
   - These are the optimized images

## Quick Test

1. Open your app in browser
2. Open DevTools → Network tab
3. Filter by "Img"
4. Reload page
5. Check if images show `image/webp` in Type column
6. Compare file sizes - WebP should be smaller

