# Environment Variables Setup Guide

## Quick Fix for DATABASE_URL Error

If you're seeing the error:
```
error: Environment variable not found: DATABASE_URL.
```

You need to add `DATABASE_URL` to your `.env.local` file.

## Steps to Add DATABASE_URL

### Option 1: Using Supabase (Recommended)

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in and select your project

2. **Get Connection String**
   - Go to: **Settings** → **Database**
   - Scroll to **Connection String** section
   - Select **URI** tab
   - Copy the connection string

3. **Add to .env.local**
   - Open `.env.local` in your project root
   - Add or update this line:
   ```
   DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require"
   ```
   - Replace `[YOUR_PASSWORD]` with your actual database password
   - Replace `[PROJECT_REF]` with your project reference ID

### Option 2: Using Connection Pooler (If direct connection fails)

1. **Get Pooler URL from Supabase**
   - Go to: **Settings** → **Database** → **Connection Pooling**
   - Copy the **Connection string** (Transaction mode)

2. **Add to .env.local**
   ```
   DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
   ```

### Option 3: Local PostgreSQL

If you're running PostgreSQL locally:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/farcaster_base_hub?sslmode=disable"
```

## Complete Environment Variables List

Add these to your `.env.local` file:

```env
# REQUIRED - Database Connection
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?sslmode=require"

# REQUIRED - JWT Secret (generate random string)
JWT_SECRET="your-random-jwt-secret-here"

# REQUIRED - Base URL
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# REQUIRED - Base RPC Endpoint
ALCHEMY_BASE_URL="https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY"

# RECOMMENDED - Neynar API (for mini-app catalog sync)
NEYNAR_API_KEY="your-neynar-api-key"

# OPTIONAL - Neynar OAuth (for Farcaster login)
NEYNAR_CLIENT_ID="your-neynar-client-id"
NEYNAR_CLIENT_SECRET="your-neynar-client-secret"

# OPTIONAL - Admin Wallet (for seeding admin account)
ADMIN_WALLET="0x..."

# OPTIONAL - Badge Contract
BADGE_CONTRACT_ADDRESS="0x..."
BADGE_ADMIN_PRIVATE_KEY="your-private-key"

# OPTIONAL - Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"
NEXT_PUBLIC_PLAUSIBLE_DOMAIN="your-domain.com"

# OPTIONAL - Cron Secret
CRON_SECRET="your-random-cron-secret"
```

## Verify Setup

After adding `DATABASE_URL`, test the connection:

```bash
npm run db:test
```

If successful, you should see:
```
✅ Database connection successful!
✅ Database query successful!
✅ All tests passed! Database is ready.
```

## Common Issues

### 1. Supabase Project is Paused
- Free tier projects pause after 1 week of inactivity
- Go to Supabase Dashboard and click "Resume"
- Wait 1-2 minutes for database to come online

### 2. Wrong Password
- Reset password in Supabase Dashboard → Settings → Database
- Update `DATABASE_URL` with new password

### 3. Connection Refused
- Check if you're using the correct port (5432 for direct, 6543 for pooler)
- Verify your network/firewall settings
- Try the connection pooler URL instead

## Need Help?

1. Check `DATABASE_TROUBLESHOOTING.md` for more detailed troubleshooting
2. Run `npm run db:test` to diagnose connection issues
3. Verify your Supabase project is active and not paused

