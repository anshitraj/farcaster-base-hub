# PNG Image Cleanup Script

This script removes apps with PNG/JPG images that cannot be converted to WebP, keeping your database clean and performant.

## What It Does

1. **Scans All Apps**: Finds all apps with PNG/JPG images (icons, headers, screenshots)
2. **Tests Conversion**: Attempts to convert each PNG/JPG image to WebP
3. **Removes Failed Apps**: If any image conversion fails (inaccessible, corrupted, etc.), removes the app
4. **Logs Removed Apps**: Provides a detailed list of removed apps so you can re-add them with WebP images

## Why Remove Apps?

- **Performance**: PNG/JPG images are larger and slower to load
- **Clean Database**: Ensures only optimized WebP images remain
- **Better UX**: Faster homepage loading with only WebP images
- **Re-add Cleanly**: You can re-add removed apps with proper WebP images

## Usage

### Option 1: Test First (Dry Run - Recommended)
```bash
npm run cleanup:png-images:dry
```

This will show you which apps would be removed without actually removing them.

### Option 2: Run Cleanup
```bash
npm run cleanup:png-images
```

### Option 3: Direct Execution
```bash
npx tsx scripts/cleanup-png-images.ts
```

## Example Output

```
🧹 Starting PNG image cleanup...

📊 Found 150 total apps

🔍 Found 25 apps with PNG/JPG images

[1/25] Processing: BETRMINT
   📥 Checking icon: https://betrmint.fun/images/app-icon.png...
   ❌ Icon conversion failed
   🗑️  Marking for removal: Icon conversion failed: https://betrmint.fun/images/app-icon.png
   ✅ App removed from database

[2/25] Processing: CAT TOWN
   📥 Checking icon: https://cat.town/fc-pre.png...
   ❌ Icon conversion failed
   🗑️  Marking for removal: Icon conversion failed: https://cat.town/fc-pre.png
   ✅ App removed from database

...

============================================================
📊 CLEANUP SUMMARY
============================================================
Total apps checked:     150
Apps with PNG/JPG:      25
✅ Apps kept:           20
🗑️  Apps removed:        5
⏱️  Time taken:          45.3s
============================================================

🗑️  REMOVED APPS (can be re-added):
============================================================

1. BETRMINT
   ID: abc12345-...
   URL: https://betrmint.fun
   Reason: Icon conversion failed: https://betrmint.fun/images/app-icon.png
   Icon: https://betrmint.fun/images/app-icon.png

2. CAT TOWN
   ID: def67890-...
   URL: https://cat.town
   Reason: Icon conversion failed: https://cat.town/fc-pre.png
   Icon: https://cat.town/fc-pre.png

...

💡 TIP: Re-add these apps with WebP images for better performance
```

## What Gets Removed?

An app is removed if:
- Icon URL is PNG/JPG and cannot be converted (inaccessible, 404, timeout, etc.)
- Header image URL is PNG/JPG and cannot be converted
- Any screenshot is PNG/JPG and cannot be converted

## What Gets Kept?

An app is kept if:
- All PNG/JPG images can be successfully converted to WebP
- Images are already WebP format
- Images are in other formats (SVG, GIF, etc.)

## After Cleanup

1. **Review Removed Apps**: Check the list of removed apps
2. **Re-add Apps**: Re-add removed apps with proper WebP images:
   - Convert images to WebP before uploading
   - Use the submit form which now auto-converts PNG/JPG
   - Or use the migration script to convert existing images
3. **Verify**: Run the script again to ensure no PNG/JPG images remain

## Safety Features

- **Dry Run Mode**: Test before actually removing apps
- **Detailed Logging**: See exactly why each app was removed
- **Error Handling**: Continues processing even if one app fails
- **Verification**: Checks database after cleanup to confirm success

## Notes

- The script processes apps sequentially to avoid overwhelming servers
- Each image is tested with a 10-second timeout
- Removed apps are logged with full details for easy re-addition
- The script verifies cleanup success at the end

