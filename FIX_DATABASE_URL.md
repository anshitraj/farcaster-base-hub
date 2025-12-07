# 🔧 Quick Fix: DATABASE_URL Not Loading

## The Problem

Drizzle Kit can't read your `DATABASE_URL` from `.env.local` even though it exists.

## ✅ Solution

I see your DATABASE_URL in `.env.local`, but it might be missing the SSL parameters. From your Neon Console, the full connection string should include query parameters.

### Step 1: Update Your DATABASE_URL in `.env.local`

Your current DATABASE_URL should look like this (from Neon Console):

```
DATABASE_URL="postgresql://neondb_owner:npg_dnkA0Z2rsIqF@ep-mute-brook-aetonel1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

**Important:** Make sure it includes:
- `?sslmode=require`
- `&channel_binding=require` (if shown in Neon Console)

### Step 2: Verify the Config is Loading

Run this test:
```bash
npm run test:db-config
```

This will tell you if DATABASE_URL is being read correctly.

### Step 3: Try Again

```bash
npm run drizzle:push
```

---

## Alternative: Set Environment Variable Directly

If dotenv still doesn't work, you can set it in your terminal:

**Windows PowerShell:**
```powershell
$env:DATABASE_URL="postgresql://neondb_owner:npg_dnkA0Z2rsIqF@ep-mute-brook-aetonel1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
npm run drizzle:push
```

**Windows CMD:**
```cmd
set DATABASE_URL=postgresql://neondb_owner:npg_dnkA0Z2rsIqF@ep-mute-brook-aetonel1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
npm run drizzle:push
```

---

## Quick Copy from Neon Console

1. Go to Neon Console (you already have it open)
2. Click **"Copy snippet"** button in the modal
3. Copy the full `DATABASE_URL` from the `.env` tab
4. Paste it into your `.env.local` file
5. Make sure there are no extra spaces or quotes issues

---

## Check Your Current DATABASE_URL

Look at line 40 of your `.env.local` file. It should be exactly:

```
DATABASE_URL="postgresql://neondb_owner:npg_dnkA0Z2rsIqF@ep-mute-brook-aetonel1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

**Note:** The URL from Neon Console includes the query parameters. Make sure your `.env.local` has the complete URL with `?sslmode=require&channel_binding=require` at the end.

