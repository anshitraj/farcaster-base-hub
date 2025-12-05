# 🔍 Understanding Your Database Setup

## Important: Localhost vs Production

**Both localhost and production should use the SAME Supabase database** - they connect via the `DATABASE_URL` environment variable.

This means:
- ✅ Apps you add locally → Stored in Supabase → Should appear in production
- ✅ Apps you add in production → Stored in Supabase → Should appear locally

---

## ❓ Why Are My Apps Missing in Production?

If your locally-imported apps aren't showing in production, here are the most likely reasons:

### 1. **Different DATABASE_URL** ⚠️
- Local `.env.local` might have different `DATABASE_URL` than Vercel
- **Check:** Compare your local `.env.local` DATABASE_URL with Vercel environment variables

### 2. **Database Connection Issue** 🔌
- Production can't connect to the database
- Database might be paused (Supabase free tier pauses after 1 week)
- **Fix:** Check Vercel build logs for database connection errors

### 3. **Apps Not Approved** ❌
- Apps might be in "pending" status
- Production only shows `status: "approved"` apps
- **Fix:** Check app status in admin panel

### 4. **Cache/Stale Data** 🔄
- Browser cache showing old data
- **Fix:** Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

---

## ✅ Solution: Export & Verify Your Apps

### Step 1: Export Your Local Apps

Run this command to export all apps from your database:

```bash
node scripts/export-my-apps.js
```

This creates `data/my-exported-apps.json` with all your actual imported apps.

### Step 2: Check What's in Your Database

1. **Check Localhost:**
   - Go to: `http://localhost:3000/admin`
   - See how many apps are listed

2. **Check Production Database Connection:**
   ```bash
   # Test production database connection
   DATABASE_URL="your-production-db-url" node scripts/test-db-connection.js
   ```

3. **Verify Apps in Database:**
   - Go to: `https://minicast.store/admin`
   - See if apps appear there
   - If empty → Database connection issue

### Step 3: Compare DATABASE_URL

**Local `.env.local`:**
```env
DATABASE_URL="postgresql://postgres:****@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
```

**Vercel Environment Variables:**
- Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
- Check: `DATABASE_URL` value
- **Should match** your local `.env.local` value!

---

## 🔧 Quick Fixes

### If Apps Are Missing:

**Option A: Export from Local, Import to Production**
1. Export: `node scripts/export-my-apps.js`
2. Copy `data/my-exported-apps.json` to `public/seed/my-apps.json`
3. Push to GitHub
4. Import in production admin panel: `https://minicast.store/seed/my-apps.json`

**Option B: Verify Same Database**
1. Check `.env.local` DATABASE_URL
2. Check Vercel DATABASE_URL
3. They should be **identical**
4. If different → Update Vercel to match local

**Option C: Re-import Locally Then Check Production**
1. Make sure DATABASE_URL is the same
2. Your apps should automatically appear in production
3. If not → Database connection issue in production

---

## 📊 Check Your Database

**Query your database directly:**

```sql
-- Count all apps
SELECT COUNT(*) FROM "MiniApp";

-- Count approved apps
SELECT COUNT(*) FROM "MiniApp" WHERE status = 'approved';

-- List all apps
SELECT name, url, status, "createdAt" FROM "MiniApp" ORDER BY "createdAt" DESC;
```

---

**Your apps ARE in the database - we just need to make sure production can see them!** 🎯







