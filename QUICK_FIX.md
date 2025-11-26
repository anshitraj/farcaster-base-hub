# 🚨 Quick Fix: Database Connection Error

## The Problem
Your app can't connect to the Supabase database. This is causing errors like:
```
Can't reach database server at `db.bxubjfdkrljzuvwiyjrl.supabase.co:5432`
```

## ✅ Quick Solution (Most Common)

**Your Supabase project is likely PAUSED** (free tier pauses after 1 week of inactivity).

### Fix in 3 Steps:

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Find project: `bxubjfdkrljzuvwiyjrl`

2. **Click "Resume" or "Restore"**
   - Wait 1-2 minutes for database to start

3. **Test Connection**
   ```powershell
   cd farcaster-base-hub
   node scripts/test-db-connection.js
   ```

4. **Apply Premium Schema** (after connection works)
   ```powershell
   npx prisma db push
   npx prisma generate
   ```

## After Database is Fixed

The Premium system we just added requires new database tables. Once your database is back online:

1. ✅ Run `npx prisma db push` - Creates Premium tables
2. ✅ Run `npx prisma generate` - Regenerates Prisma client  
3. ✅ Restart dev server - `npm run dev`

## Alternative: Use Connection Pooler

If direct connection fails, use the pooler URL from Supabase Dashboard:
- Settings → Database → Connection Pooling
- Copy "Transaction mode" connection string
- Update `DATABASE_URL` in `.env.local`

See `FIX_DATABASE.md` for detailed instructions.

