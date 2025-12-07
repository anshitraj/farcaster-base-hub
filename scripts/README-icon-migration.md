# Icon Migration to WebP

This script converts all PNG/JPG app icons in the database to optimized WebP format.

## Prerequisites

1. **Environment Variables**: Ensure `.env.local` has `DATABASE_URL` set
2. **Dependencies**: `sharp` must be installed (`npm install sharp`)
3. **Database**: Neon database must be accessible

## Usage

### Option 1: Using npm script (Recommended)
```bash
npm run migrate:icons-webp
```

### Option 2: Direct execution
```bash
npx tsx scripts/convert-icons-to-webp.ts
```

## What It Does

1. **Fetches Apps**: Finds all apps with PNG/JPG icon URLs from the database
2. **Downloads Images**: Downloads each image (max 10MB, 30s timeout)
3. **Converts to WebP**: Uses sharp to convert with 75% quality
4. **Saves Locally**: Stores converted images in `public/uploads/icons/`
5. **Updates Database**: Updates each app's `iconUrl` with the new WebP path
6. **Verifies**: Checks that no PNG/JPG URLs remain

## Output

- **Success**: Shows conversion progress and summary
- **Failed**: Lists apps that couldn't be converted with error messages
- **Verification**: Confirms all PNG/JPG icons are converted

## Example Output

```
🚀 Starting icon migration to WebP...

📊 Fetching apps with PNG/JPG icons...
   Found 25 apps with PNG/JPG icons

[1/25] Processing: BETRMINT
📥 Downloading: BETRMINT (https://betrmint.fun/images/app-icon.png...)
   ✓ Downloaded 245.3KB
   🔄 Converting to WebP...
   ✓ Converted to 28.7KB WebP
   ✅ Saved to /uploads/icons/abc12345-betrmint-icon.webp
   💾 Database updated

...

============================================================
📊 MIGRATION SUMMARY
============================================================
Total apps found:     25
✅ Successfully converted: 23
❌ Failed:            2
⏱️  Time taken:        45.3s
============================================================

✅ All PNG/JPG icons have been converted!
```

## Configuration

Edit the script to change:
- `WEBP_QUALITY`: Image quality (default: 75)
- `UPLOAD_DIR`: Where to save converted images
- `MAX_DOWNLOAD_SIZE`: Maximum image size (default: 10MB)
- `DOWNLOAD_TIMEOUT`: Download timeout (default: 30s)

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

1. **Verify**: Check that homepage loads faster
2. **Test**: Ensure all app icons display correctly
3. **Cleanup**: Optionally delete original PNG/JPG files from external storage

## Notes

- Script processes images sequentially to avoid overwhelming servers
- Failed conversions are logged but don't stop the migration
- Original URLs are preserved in logs for debugging
- Database is updated only after successful conversion


