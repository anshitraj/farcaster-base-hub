# Vercel Deployment Issues - Fix Guide

## Problem 1: Image 404 Errors (99+ errors)

### Root Cause
- `public/uploads/` folder is gitignored (line 29 in `.gitignore`)
- Uploaded images are NOT committed to Git
- When Vercel builds from GitHub, these files don't exist
- Code tries to serve `/uploads/icons/...` directly, causing 404s

### Solution Options

#### Option A: Use External Image Storage (RECOMMENDED)
Store images in cloud storage (S3, Cloudinary, ImageKit) instead of local filesystem.

**Steps:**
1. Set up Cloudinary or S3 bucket
2. Update upload route to upload to cloud storage
3. Store cloud URLs in database
4. Images will always be available

#### Option B: Fix Image Serving Route (QUICK FIX)
Make ALL images go through `/api/icon` route, which handles missing files gracefully.

**Update AppCard.tsx:**
```typescript
// Change from:
src={iconUrl.startsWith("/uploads/") ? iconUrl : `/api/icon?id=${id}`}

// To:
src={`/api/icon?url=${encodeURIComponent(iconUrl)}`}
```

#### Option C: Use Database Storage
Store images as base64 in database (not recommended for large files).

### Immediate Fix
Update the code to always use the `/api/icon` route which returns placeholders for missing images:

```typescript
// This will prevent 404s by returning placeholders
src={`/api/icon?url=${encodeURIComponent(iconUrl || '')}`}
```

---

## Problem 2: Changes Not Reflecting in Vercel

### Check These:

#### 1. Verify Branch Connection
1. Go to Vercel Dashboard → Your Project → Settings → Git
2. Check which branch is connected (should be `test` or `main`)
3. Make sure you pushed to the correct branch

#### 2. Check Build Status
1. Go to Vercel Dashboard → Deployments
2. Check if latest deployment:
   - ✅ Shows "Ready" (green)
   - ❌ Shows "Error" or "Failed"
3. Click on the deployment to see build logs
4. Look for errors in the build logs

#### 3. Force Redeploy
1. Go to Deployments tab
2. Click **three dots** (⋯) on latest deployment
3. Click **Redeploy**
4. Or push an empty commit:
   ```bash
   git commit --allow-empty -m "Trigger redeploy"
   git push origin test
   ```

#### 4. Clear Vercel Cache
1. Go to Settings → General
2. Scroll to "Clear Build Cache"
3. Click "Clear Build Cache"
4. Redeploy

#### 5. Check Environment Variables
1. Go to Settings → Environment Variables
2. Verify all required variables are set
3. Make sure they're set for **Production** environment
4. Redeploy after adding/changing variables

#### 6. Verify Git Push
```bash
# Check if your commit is on GitHub
git log --oneline -5

# Check remote branch
git branch -r

# If not pushed, push again
git push origin test
```

---

## Quick Fix Steps (Do This Now)

### Step 1: Fix Image 404s
Update `AppCard.tsx` to always use the icon API route:

```typescript
// This prevents 404s by using the API route which handles missing files
src={iconUrl ? `/api/icon?url=${encodeURIComponent(iconUrl)}` : '/placeholder.svg'}
```

### Step 2: Verify Vercel Settings
1. **Check Branch**: Settings → Git → Production Branch = `test` (or your branch)
2. **Check Build Command**: Should be `npm run build`
3. **Check Output Directory**: Should be `.next` (default)

### Step 3: Force Redeploy
```bash
# In your project
git commit --allow-empty -m "Force redeploy - fix image 404s"
git push origin test
```

### Step 4: Check Deployment Logs
1. Go to Vercel → Deployments
2. Click on latest deployment
3. Check "Build Logs" tab
4. Look for:
   - ✅ "Build Completed"
   - ❌ Any errors (fix those first)

---

## Long-Term Solution: Use Cloud Storage

### Recommended: Cloudinary (Free tier available)

1. **Sign up**: https://cloudinary.com
2. **Get credentials**: Cloud name, API Key, API Secret
3. **Update upload route** (`src/app/api/admin/upload/route.ts`):
   ```typescript
   import { v2 as cloudinary } from 'cloudinary';
   
   cloudinary.config({
     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
     api_key: process.env.CLOUDINARY_API_KEY,
     api_secret: process.env.CLOUDINARY_API_SECRET,
   });
   
   // Upload to Cloudinary instead of local filesystem
   const result = await cloudinary.uploader.upload(buffer, {
     folder: 'miniapp-store',
     resource_type: 'image',
     format: 'webp',
   });
   
   // Store result.secure_url in database
   ```

4. **Add to Vercel Environment Variables**:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

5. **Update image serving**: Images will be served directly from Cloudinary CDN

---

## Verify Fix

After applying fixes:

1. **Check Console**: Should see fewer/no 404 errors
2. **Check Images**: App icons should load (or show placeholders)
3. **Check Deployment**: Latest changes should be live
4. **Test Badges Page**: `/badges` should work

---

## Common Vercel Issues

### Build Failing?
- Check build logs for specific errors
- Verify `package.json` has correct scripts
- Check Node.js version (should be 18+)

### Environment Variables Not Working?
- Make sure they're set for **Production** environment
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

### Still Seeing Old Code?
- Hard refresh browser (Ctrl+Shift+R)
- Clear browser cache
- Check if you're on the right domain
- Verify deployment is actually "Ready" (not "Building")

---

## Next Steps

1. ✅ Apply image fix (use `/api/icon` for all images)
2. ✅ Verify Vercel branch connection
3. ✅ Force redeploy
4. ✅ Check deployment logs
5. ✅ Set up cloud storage (long-term solution)

