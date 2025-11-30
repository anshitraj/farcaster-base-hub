# 📦 Export & Migrate Your Actual Apps

## 🎯 The Real Situation

You imported apps **locally using admin portal** → Those apps are in **your Supabase database** → They **should automatically appear in production** if both environments use the same database.

---

## ✅ Quick Check: Are They in the Same Database?

### Step 1: Check Your DATABASE_URL

**Local (.env.local):**
```bash
# Check what database localhost is using
cat .env.local | grep DATABASE_URL
```

**Vercel (Production):**
1. Go to: https://vercel.com → Your Project → Settings → Environment Variables
2. Find `DATABASE_URL`
3. **Compare** with your local `.env.local`

**If they match** → Same database ✅ Your apps should already be in production!

**If they're different** → Different databases ❌ Need to migrate

---

## 📤 Export Your Real Apps (Once Database is Connected)

### Step 1: Resume Database (if paused)

Go to: https://supabase.com/dashboard → Resume your project

### Step 2: Export Apps

```bash
npm run export:apps
```

This creates: `data/my-exported-apps.json` with YOUR actual imported apps.

### Step 3: Copy to Public Folder

```bash
cp data/my-exported-apps.json public/seed/my-real-apps.json
```

### Step 4: Push to GitHub & Import in Production

1. Push to GitHub:
   ```bash
   git add public/seed/my-real-apps.json
   git commit -m "Add exported real apps backup"
   git push
   ```

2. Import in Production Admin Panel:
   - Go to: `https://minicast.store/admin`
   - Click "Bulk Import (CSV JSON)"
   - URL: `https://minicast.store/seed/my-real-apps.json`
   - Import!

---

## 🔄 If Using Different Databases

If local and production use **different** databases:

1. **Export from local database:**
   ```bash
   npm run export:apps
   ```

2. **Import to production database:**
   - Use admin panel in production
   - Import the exported JSON file

---

## 💡 Most Likely Scenario

**Your apps ARE in production already!** The issue is probably:

1. **Database is paused** → Resume it
2. **Apps are pending** → Approve them in admin panel
3. **Cache issue** → Clear browser cache

**After resuming database, refresh production site - your apps should be there!** ✨



