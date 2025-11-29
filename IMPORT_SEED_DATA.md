# 🚀 How to Import Your Seed Data - FIXED!

## 🔍 Problem Identified

Your database is **currently empty** (83 apps in seed file, but 0 in database).

This is why you see:
- ❌ "No trending apps available"
- ❌ Empty category cards
- ❌ No apps showing on homepage

---

## ✅ Solution: Import Seed Data

### Option 1: Via Admin Panel (Easiest)

1. **Go to Admin Panel**
   - Visit: **`https://minicast.store/admin`**
   - Make sure you're logged in with your admin wallet

2. **Click "Bulk Import (CSV JSON)" button**

3. **Enter this URL:**
   ```
   https://minicast.store/seed/miniapps-seed.json
   ```

4. **Default Developer Wallet:**
   ```
   0x0CF70E448ac98689e326bd79075a96CcBcec1665
   ```
   (Or leave empty to use default)

5. **Click "Import Apps"**

6. **Wait for success message:**
   - Should say: "Imported 83 apps (83 created, 0 updated)"

7. **Refresh homepage** → Apps should appear! 🎉

---

### Option 2: Check Database Connection First

Before importing, verify your database is connected:

1. **Check Vercel Environment Variables:**
   - Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
   - Verify `DATABASE_URL` is set correctly
   - Should look like: `postgresql://postgres:****@db.****.supabase.co:5432/postgres?sslmode=require`

2. **Test Database Connection:**
   ```bash
   npm run db:test
   ```

3. **If database is paused:**
   - Go to https://supabase.com/dashboard
   - Find your project → Click "Resume" if paused
   - Free tier projects auto-pause after 1 week

---

## 🔧 Quick Troubleshooting

### Can't access admin panel?
- Make sure you're logged in
- Your wallet must be set as `ADMIN` or `MODERATOR` in the database
- Check: `/api/admin/check` endpoint to verify access

### Import fails?
- Check browser console (F12) for errors
- Verify seed file URL is accessible: `https://minicast.store/seed/miniapps-seed.json`
- Make sure database connection is working

### Apps imported but still not showing?
- Apps need `Status: "approved"` - the seed file has this
- Clear browser cache and refresh
- Check API response: `/api/apps/trending` should return apps

---

## 📊 Verify Import Success

After importing, check:

1. **Admin Panel Apps List** - Should show 83 apps
2. **Homepage** - Should show trending apps
3. **API Endpoint:** `https://minicast.store/api/apps?limit=10`
   - Should return apps array with data

---

**Your seed file has 83 apps ready to import!** Once imported, your homepage will be populated. 🚀

