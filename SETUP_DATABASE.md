# 🔧 Database Setup Guide

## Issues Fixed

1. ✅ **Import script updated** - Now uses Drizzle ORM instead of Prisma
2. ⚠️ **DATABASE_URL required** - You need to set this up

---

## Step 1: Create `.env.local` File

Create a file named `.env.local` in the `farcaster-base-hub` directory with your database connection string.

### Option A: Using Neon (Recommended for Vercel)

```bash
DATABASE_URL="postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### Option B: Using Supabase

```bash
DATABASE_URL="postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres?sslmode=require"
```

### Option C: Using Local PostgreSQL

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/farcaster_db"
```

**Important:** 
- `.env.local` is gitignored (safe for secrets)
- Never commit this file to git
- The format should match one of the examples above

---

## Step 2: Push Database Schema

Once your `DATABASE_URL` is set, push the schema to your database:

```bash
npm run drizzle:push
```

This will create all the necessary tables in your database.

---

## Step 3: Import Seed Data

Now you can import the seed data using the new Drizzle-based script:

```bash
npm run import:seed:drizzle
```

Or manually:
```bash
npx tsx scripts/import-seed-drizzle.ts
```

---

## Troubleshooting

### Error: "DATABASE_URL is not set"

**Solution:** Make sure you created `.env.local` file in the `farcaster-base-hub` directory with:
```
DATABASE_URL="your-connection-string-here"
```

### Error: "Cannot find module '@prisma/client'"

**Solution:** The old import script uses Prisma, but your project uses Drizzle. Use the new script:
```bash
npm run import:seed:drizzle
```

### Error: "Either connection 'url' or 'host', 'database' are required"

**Solution:** 
1. Check that `.env.local` exists
2. Check that `DATABASE_URL` is set correctly
3. Verify the connection string format matches one of the examples above
4. Try loading environment variables manually:
   ```bash
   # Windows PowerShell
   $env:DATABASE_URL="your-connection-string"
   npm run drizzle:push
   
   # Windows CMD
   set DATABASE_URL=your-connection-string
   npm run drizzle:push
   
   # Mac/Linux
   export DATABASE_URL="your-connection-string"
   npm run drizzle:push
   ```

### Database Connection Failed

**If using Supabase:**
- Check if your project is paused: https://supabase.com/dashboard
- Free tier projects auto-pause after 1 week of inactivity
- Click "Resume" if paused

**If using Neon:**
- Check your Neon dashboard for connection status
- Verify your connection string is correct

---

## Next Steps

After importing seed data:

1. ✅ Verify apps appear: Visit `/api/apps/trending` in browser
2. ✅ Check homepage: Should show trending apps
3. ✅ Restart dev server: `npm run dev`

---

## Quick Reference

```bash
# 1. Create .env.local with DATABASE_URL
echo 'DATABASE_URL="your-connection-string"' > .env.local

# 2. Push schema
npm run drizzle:push

# 3. Import seed data
npm run import:seed:drizzle

# 4. Start dev server
npm run dev
```

