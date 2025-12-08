# Complete Image Migration to WebP

This script converts **ALL** PNG/JPG images in the database to optimized WebP format:

- ✅ **App Icons** (`MiniApp.iconUrl`)
- ✅ **App Header Images** (`MiniApp.headerImageUrl`)
- ✅ **App Screenshots** (`MiniApp.screenshots` array)
- ✅ **Developer Avatars** (`Developer.avatar`)

## Prerequisites

1. **Environment Variables**: Ensure `.env.local` has `DATABASE_URL` set
2. **Dependencies**: `sharp` must be installed (`npm install sharp`)
3. **Database**: Neon database must be accessible

## Usage

### Option 1: Using npm script (Recommended)
```bash
npm run migrate:all-images-webp
```

### Option 2: Test first (Dry Run)
```bash
npm run migrate:all-images-webp:dry
```

### Option 3: Direct execution
```bash
npx tsx scripts/convert-all-images-to-webp.ts
```

## What It Does

1. **Fetches All Images**: Finds all PNG/JPG images across all tables
2. **Downloads Images**: Downloads each image (max 10MB, 30s timeout)
3. **Converts to WebP**: Uses sharp to convert with 75% quality
4. **Saves Locally**: Stores converted images in organized folders:
   - `public/uploads/icons/` - App icons
   - `public/uploads/headers/` - Header images
   - `public/uploads/screenshots/` - Screenshots
   - `public/uploads/avatars/` - Developer avatars
5. **Updates Database**: Updates all image URLs with new WebP paths
6. **Verifies**: Checks that no PNG/JPG URLs remain

## Output Structure

```
public/uploads/
├── icons/
│   └── {appId}-{name}-icon.webp
├── headers/
│   └── {appId}-{name}-header.webp
├── screenshots/
│   └── {appId}-{name}-screenshot-{index}.webp
└── avatars/
    └── {devId}-{name}-avatar.webp
```

## Example Output

```
🚀 Starting complete image migration to WebP...

============================================================
📱 PROCESSING APP ICONS
============================================================
Found 25 apps with PNG/JPG icons

[1/25] Processing icon: BETRMINT
📥 Downloading icon: BETRMINT (https://betrmint.fun/images/app-icon.png...)
   ✓ Downloaded 245.3KB
   🔄 Converting to WebP...
   ✓ Converted to 28.7KB WebP
   ✅ Saved to /uploads/icons/abc12345-betrmint-icon.webp
   💾 Database updated

============================================================
🖼️  PROCESSING APP HEADER IMAGES
============================================================
Found 10 apps with PNG/JPG header images

...

============================================================
📸 PROCESSING APP SCREENSHOTS
============================================================
Found 15 apps with PNG/JPG screenshots (45 total screenshots)

[1/15] Processing screenshots: BETRMINT (3 screenshots)
📥 Downloading screenshot #1: BETRMINT (https://...)
   ✓ Downloaded 512.4KB
   🔄 Converting to WebP...
   ✓ Converted to 89.2KB WebP
   ✅ Saved to /uploads/screenshots/abc12345-screenshot-0.webp
   💾 Database updated with 3 screenshots

============================================================
👤 PROCESSING DEVELOPER AVATARS
============================================================
Found 8 developers with PNG/JPG avatars

...

============================================================
📊 MIGRATION SUMMARY
============================================================

📱 APP ICONS:
   Total:     25
   ✅ Success: 23
   ❌ Failed:  2

🖼️  HEADER IMAGES:
   Total:     10
   ✅ Success: 10
   ❌ Failed:  0

📸 SCREENSHOTS:
   Total:     45
   ✅ Success: 43
   ❌ Failed:  2

👤 DEVELOPER AVATARS:
   Total:     8
   ✅ Success: 8
   ❌ Failed:  0

⏱️  Time taken: 120.5s
============================================================

✅ All PNG/JPG images have been converted!
```

## Configuration

Edit the script to change:
- `WEBP_QUALITY`: Image quality (default: 75)
- `UPLOAD_DIR`: Base directory for uploads
- `MAX_DOWNLOAD_SIZE`: Maximum image size (default: 10MB)
- `DOWNLOAD_TIMEOUT`: Download timeout (default: 30s)

## Screenshots Handling

- Screenshots are stored as arrays in the database
- Each PNG/JPG screenshot in the array is converted individually
- Non-PNG/JPG screenshots are preserved as-is
- The entire array is updated after all conversions

## Troubleshooting

### "DATABASE_URL is not set"
- Ensure `.env.local` exists and contains `DATABASE_URL`

### "Download timeout"
- Image server is slow or unreachable
- Check the URL manually
- Script will skip and continue

### "Image too large"
- Increase `MAX_DOWNLOAD_SIZE` if needed
- Or manually convert large images first

### "Conversion failed"
- Image might be corrupted
- Check the original URL
- Script will log the error and continue

## After Migration

1. **Verify**: Check that all pages load faster
2. **Test**: Ensure all images display correctly:
   - App icons on homepage
   - Header images on app detail pages
   - Screenshots in app galleries
   - Developer avatars in profiles
3. **Cleanup**: Optionally delete original PNG/JPG files from external storage

## Notes

- Script processes images sequentially to avoid overwhelming servers
- Failed conversions are logged but don't stop the migration
- Original URLs are preserved in logs for debugging
- Database is updated only after successful conversion
- Screenshots array is updated atomically (all or nothing per app)

