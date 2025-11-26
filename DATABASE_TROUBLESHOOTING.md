# Database Connection Troubleshooting

## Current Issue
Your database at `db.bxubjfdkrljzuvwiyjrl.supabase.co:5432` cannot be reached.

## Most Common Cause: Paused Supabase Project

**Supabase free tier projects automatically pause after 1 week of inactivity.**

### How to Fix:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Sign in with your account

2. **Find Your Project**
   - Look for project with reference: `bxubjfdkrljzuvwiyjrl`
   - Or search for projects containing "bxubjfdkrljzuvwiyjrl"

3. **Check Project Status**
   - If you see a "Paused" badge or status
   - Click the "Resume" or "Restore" button
   - Wait 1-2 minutes for the database to come back online

4. **Verify Connection**
   - After resuming, run: `npm run db:test`
   - Should show: ✅ Database connection successful!

## Alternative: Use Connection Pooler

If direct connection (port 5432) doesn't work, try the connection pooler:

1. **Get Pooler URL from Supabase Dashboard**
   - Go to: Settings → Database → Connection Pooling
   - Copy the "Connection string" (Transaction mode)
   - Format: `postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`

2. **Update .env file**
   ```bash
   DATABASE_URL="postgresql://postgres.bxubjfdkrljzuvwiyjrl:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
   ```

3. **Test again**
   ```bash
   npm run db:test
   ```

## Other Possible Issues

### Network/Firewall
- Check if port 5432 or 6543 is blocked
- Try from a different network
- Check VPN/firewall settings

### Wrong Credentials
- Verify password in `.env` file
- Reset password in Supabase Dashboard if needed

### Project Deleted
- Check if project still exists in dashboard
- Create a new project if it was deleted

## Quick Test Commands

```bash
# Test database connection
npm run db:test

# Push schema to database
npm run db:push

# Open Prisma Studio (visual database browser)
npm run db:studio
```

## Need Help?

If the project is not paused and connection still fails:
1. Check Supabase status page: https://status.supabase.com
2. Verify your Supabase account is active
3. Check if you've exceeded free tier limits
4. Contact Supabase support if needed

