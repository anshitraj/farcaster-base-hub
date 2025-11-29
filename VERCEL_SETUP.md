# Vercel Deployment Setup Guide

## Critical: Environment Variables Required

Your production site is showing 503 errors because the database connection is failing. You **MUST** set these environment variables in Vercel:

### Required Environment Variables

1. **DATABASE_URL** (CRITICAL)
   - Value: `postgresql://postgres:Bleedingedge20030@db.bxubjfdkrljzuvwiyjrl.supabase.co:5432/postgres?sslmode=require`
   - **Without this, the entire app will fail with 503 errors**

2. **ALCHEMY_BASE_URL**
   - Value: `https://base-mainnet.g.alchemy.com/v2/PV27Fj8crxUz2G6c0jRUJ`
   - Needed for wallet balance checks

3. **ADMIN_WALLET**
   - Value: `0x2de9fc192ef7502e7113db457e01cc058d25b32b`
   - Your admin wallet address

4. **JWT_SECRET**
   - Value: `bBbIAJ6vGPFAuuelJsXkXjdvLtZPq71dnXNJojyF9UU=`
   - For session tokens

### Optional Environment Variables

- `BADGE_CONTRACT_ADDRESS` (if you have badge minting)
- `BADGE_ADMIN_PRIVATE_KEY` (if you have badge minting)
- `NEXT_PUBLIC_BASE_URL` (your production URL)

## How to Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`farcaster-base-hub` or `minicast.store`)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. For each variable:
   - Enter the **Name** (e.g., `DATABASE_URL`)
   - Enter the **Value** (from your `.env.local`)
   - Select **Environments**: Check **Production**, **Preview**, and **Development**
   - Click **Save**
6. **Redeploy** your application:
   - Go to **Deployments** tab
   - Click the **three dots** (⋯) on the latest deployment
   - Click **Redeploy**

## Check Supabase Database Status

If you still get 503 errors after setting environment variables:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Find your project
3. Check if it shows **"Paused"**
4. If paused, click **"Resume"** (free tier projects pause after 1 week of inactivity)
5. Wait 1-2 minutes for the database to resume
6. Try your site again

## Verify Environment Variables Are Set

After redeploying, you can verify by:
1. Going to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Make sure all variables show with a checkmark ✅
3. Check the deployment logs to see if `DATABASE_URL` is being loaded

## Connection Pooling (Optional but Recommended)

For better performance, consider using Supabase's connection pooler:

1. Go to Supabase Dashboard → Settings → Database → Connection Pooling
2. Copy the **Connection Pooling** URL (starts with `postgresql://postgres.[PROJECT_REF]`)
3. Use this URL instead of the direct connection URL in Vercel
4. Format: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`

## Troubleshooting

### Still getting 503 errors?
- ✅ Check Vercel deployment logs for specific error messages
- ✅ Verify DATABASE_URL is set correctly (no extra spaces, quotes, etc.)
- ✅ Check if Supabase project is paused
- ✅ Try the connection pooler URL instead
- ✅ Check Vercel function logs for database connection errors

### Database connection timeout?
- Use the connection pooler URL (port 6543) instead of direct connection (port 5432)
- Pooler handles connections better in serverless environments

