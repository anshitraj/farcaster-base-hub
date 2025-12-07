# 🔧 Fix: Multiple DATABASE_URL Definitions

## The Problem

Your `.env.local` file has **multiple DATABASE_URL definitions**, and dotenv is loading the **first (old) one** instead of your new Neon connection string.

The test script shows it's loading:
```
postgresql://postgres:Bleedingedge20030@db.bxubjfdkrljzuvwiy...
```
(This is your old Supabase URL)

But you want to use:
```
postgresql://neondb_owner:npg_dnkA0Z2rsIqF@ep-mute-brook-aetonel1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```
(This is your new Neon URL)

## ✅ Solution

### Option 1: Keep Only One DATABASE_URL (Recommended)

1. **Open `.env.local`** in your editor
2. **Find ALL lines** that say `DATABASE_URL=`
3. **Comment out or delete** the old ones (put `#` at the start to comment)
4. **Keep only ONE** active DATABASE_URL with your Neon connection string

Example:
```env
# Old Supabase (commented out)
# DATABASE_URL="postgresql://postgres:Bleedingedge20030@db.bxubjfdkrljzuvwiy..."

# Active Neon Database URL
DATABASE_URL="postgresql://neondb_owner:npg_dnkA0Z2rsIqF@ep-mute-brook-aetonel1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

### Option 2: Make Sure Neon URL is First

Move your Neon DATABASE_URL to be the **first** DATABASE_URL line in the file.

---

## Step-by-Step Fix

1. **Open** `.env.local` file
2. **Search** for `DATABASE_URL` (you'll find multiple)
3. **Delete or comment out** all old ones
4. **Keep only the Neon one** with the full URL including:
   - `?sslmode=require`
   - `&channel_binding=require`

5. **Save the file**

6. **Test again:**
   ```bash
   npm run test:db-config
   ```
   
   You should now see the Neon URL.

7. **Push schema:**
   ```bash
   npm run drizzle:push
   ```

---

## Quick Copy from Neon Console

1. In Neon Console modal, click **"Copy snippet"**
2. Copy the full `DATABASE_URL` from `.env` tab
3. **Replace** all DATABASE_URL lines in `.env.local` with just this one line

---

**After fixing, your `.env.local` should have ONLY ONE active DATABASE_URL line!** ✅

