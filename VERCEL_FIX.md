# Fix 503 Errors in Vercel - Use Connection Pooling

## The Problem
You're getting 503 errors because Supabase's direct connection (port 5432) doesn't work well with Vercel's serverless functions. You need to use **Connection Pooling** (port 6543).

## Solution: Use Supabase Connection Pooler

### Step 1: Get Your Connection Pooler URL

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (`miniapp-store`)
3. Go to **Settings** → **Database**
4. Scroll down to **Connection Pooling**
5. Copy the **Connection Pooling** URL (it looks like this):
   ```
   postgresql://postgres.bxubjfdkrljzuvwiyjrl:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
   ```

### Step 2: Update DATABASE_URL in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Your Project → **Settings** → **Environment Variables**
3. Find `DATABASE_URL`
4. Click to edit it
5. Replace the value with your **Connection Pooler URL** from Step 1
6. Make sure to:
   - Replace `[PASSWORD]` with your actual password: `Bleedingedge20030`
   - The URL should end with `?pgbouncer=true&sslmode=require`
   - Port should be `6543` (not 5432)
7. Click **Save**

### Step 3: Add DIRECT_URL (Optional but Recommended)

For migrations and schema operations, you might need the direct connection:

1. In Vercel Environment Variables, add a new variable:
   - **Name**: `DIRECT_URL`
   - **Value**: Your original direct connection URL (port 5432)
   - **Environments**: All Environments
   - Click **Save**

### Step 4: Redeploy

**CRITICAL**: After changing environment variables, you MUST redeploy:

1. Go to **Deployments** tab
2. Click the **three dots** (⋯) on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete (2-3 minutes)

## Why This Works

- **Direct Connection (5432)**: Creates a new connection for each request, which times out in serverless
- **Connection Pooler (6543)**: Reuses connections, perfect for serverless/Vercel
- **pgbouncer=true**: Enables connection pooling mode

## Verify It's Working

After redeploying:
1. Go to your site: `https://www.minicast.store`
2. Open browser console (F12)
3. Check if 503 errors are gone
4. API requests should return 200 instead of 503

## Still Having Issues?

1. Check Vercel deployment logs for specific errors
2. Verify the pooler URL is correct (no typos)
3. Make sure you redeployed after changing variables
4. Check Supabase dashboard - project should be active (not paused)

