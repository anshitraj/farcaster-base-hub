# 🔧 Quick Fix: Database Connection Issue

## Problem
Your Supabase database at `db.bxubjfdkrljzuvwiyjrl.supabase.co:5432` cannot be reached.

## Most Likely Cause: Paused Supabase Project

**Supabase free tier projects automatically pause after 1 week of inactivity.**

## ✅ Solution Steps

### Step 1: Resume Your Supabase Project

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in with your account

2. **Find Your Project**
   - Look for project with reference: `bxubjfdkrljzuvwiyjrl`
   - Or search for projects containing this reference

3. **Resume the Project**
   - If you see a "Paused" badge or status
   - Click the **"Resume"** or **"Restore"** button
   - Wait 1-2 minutes for the database to come back online

### Step 2: Test Connection

After resuming, test the connection:

```powershell
cd farcaster-base-hub
node scripts/test-db-connection.js
```

You should see: ✅ Database connection successful!

### Step 3: Apply Premium Schema Changes

Once the database is connected, apply the new Premium system schema:

```powershell
npx prisma db push
```

This will create the new tables:
- `PremiumSubscription`
- `AccessCode`
- `PremiumApp`
- `BoostRequest`

### Step 4: Regenerate Prisma Client

```powershell
npx prisma generate
```

## Alternative: Use Connection Pooler

If direct connection (port 5432) doesn't work, try the connection pooler:

1. **Get Pooler URL from Supabase Dashboard**
   - Go to: Settings → Database → Connection Pooling
   - Copy the "Connection string" (Transaction mode)
   - Format: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`

2. **Update `.env.local` file**
   ```bash
   DATABASE_URL="postgresql://postgres.bxubjfdkrljzuvwiyjrl:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
   ```

3. **Test again**
   ```powershell
   node scripts/test-db-connection.js
   ```

## After Database is Fixed

Once your database is back online:

1. ✅ Run `npx prisma db push` to apply Premium schema
2. ✅ Run `npx prisma generate` to regenerate client
3. ✅ Restart your dev server: `npm run dev`

## Need Help?

- Check Supabase status: https://status.supabase.com
- Verify your Supabase account is active
- Check if you've exceeded free tier limits

