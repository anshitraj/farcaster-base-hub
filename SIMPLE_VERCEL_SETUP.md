# 🎯 Simple Vercel Setup Guide - Step by Step

## ✅ What You Need (3 Things Only!)

### 1. Database URL from Supabase 📊

**How to get it:**
1. You're already in Supabase dashboard ✅
2. Go to **Settings** (left sidebar) → **Database**
3. Scroll down to **Connection String** section
4. Click on **URI** tab
5. Copy the entire connection string

**It looks like:**
```
postgresql://postgres:Bleedingedge20030@db.bxubjfdkrljzuvwiyjrl.supabase.co:5432/postgres?sslmode=require
```

### 2. Generate JWT Secret 🔐

**Open PowerShell/Command Prompt** and run:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Copy the output** (it will be a long random string like `bBbIAJ6vGPFAuuelJsXkXjdvLtZPq71dnXNJojyF9UU=`)

### 3. Your Domain URL 🌐

Just use: `https://minicast.store`

---

## 🚀 Now Add These to Vercel

### Step 1: Go to Vercel
1. Visit: https://vercel.com/dashboard
2. Find your project (or create new one)
3. Click on your project name

### Step 2: Go to Settings
1. Click **Settings** tab (at the top)
2. Click **Environment Variables** (in left sidebar)

### Step 3: Add Each Variable

Click **"Add New"** button 3 times and add:

#### Variable 1: DATABASE_URL
- **Key:** `DATABASE_URL`
- **Value:** (paste your Supabase connection string from step 1)
- **Environment:** ✅ Production ✅ Preview ✅ Development (check all 3)
- Click **Save**

#### Variable 2: JWT_SECRET
- **Key:** `JWT_SECRET`
- **Value:** (paste the generated secret from step 2)
- **Environment:** ✅ Production ✅ Preview ✅ Development (check all 3)
- Click **Save**

#### Variable 3: NEXT_PUBLIC_BASE_URL
- **Key:** `NEXT_PUBLIC_BASE_URL`
- **Value:** `https://minicast.store`
- **Environment:** ✅ Production ✅ Preview ✅ Development (check all 3)
- Click **Save**

---

## ❌ What to IGNORE

### Don't Use:
- ❌ Supabase JWT Secret (that page you saw)
- ❌ Supabase API Keys
- ❌ Any other Supabase secrets

**You ONLY need the database connection string!**

---

## ✅ Quick Checklist

- [ ] Got DATABASE_URL from Supabase Database settings
- [ ] Generated JWT_SECRET using the Node.js command
- [ ] Added DATABASE_URL to Vercel
- [ ] Added JWT_SECRET to Vercel
- [ ] Added NEXT_PUBLIC_BASE_URL to Vercel
- [ ] All variables are enabled for Production, Preview, and Development

---

## 🎉 That's It!

Once you've added all 3 variables, your app is ready to deploy!

**Next step:** Deploy your app on Vercel (it will automatically use these environment variables).

---

## 🆘 Still Confused?

**Remember:**
- ✅ Use Supabase → **Only for the database connection string**
- ✅ Generate JWT_SECRET → **Use your own, not Supabase's**
- ❌ Ignore Supabase JWT Secret → **You don't need it!**

Need more help? Check `SUPABASE_VS_APP_JWT.md` for detailed explanation.

