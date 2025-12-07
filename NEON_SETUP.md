# Neon Database Setup Guide

## ⚠️ Current Issue

Your Neon database doesn't have tables yet. The error `relation "MiniApp" does not exist` means the schema hasn't been created.

## ✅ Solution: Create Schema First, Then Migrate Data

### Step 1: Verify DATABASE_URL in .env.local

Make sure your `.env.local` file has your **Neon** database URL:

```bash
DATABASE_URL="postgresql://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require"
```

**Important:** This should be your **Neon** URL, not Supabase!

### Step 2: Push Schema to Neon

Run this command to create all tables in Neon:

```bash
npm run db:push-schema
```

Or manually:

```bash
npm run drizzle:push
```

This will create all 22 tables in your Neon database based on your Drizzle schema.

### Step 3: Verify Tables Created

Check your Neon dashboard to confirm tables exist:
- Developer
- MiniApp
- Badge
- Review
- UserSession
- etc.

### Step 4: Migrate Data from Supabase

Once tables exist, migrate your data:

```bash
# Set both database URLs
export OLD_DATABASE_URL="postgresql://...@supabase.co:5432/..."  # Your Supabase URL
export NEW_DATABASE_URL="postgresql://...@neon.tech/..."          # Your Neon URL

# Install pg for migration script
npm install pg

# Run migration
node scripts/migrate-to-neon.js
```

## 🔍 Troubleshooting

### Error: "DATABASE_URL is not set"
- Make sure `.env.local` exists and has `DATABASE_URL`
- Check that the URL points to Neon (not Supabase)

### Error: "relation does not exist"
- You haven't pushed the schema yet - run `npm run db:push-schema`

### Error: "connection refused"
- Check your Neon database is active (not paused)
- Verify the connection string is correct
- Ensure SSL mode is set: `?sslmode=require`

## 📋 Quick Checklist

- [ ] `.env.local` has Neon `DATABASE_URL`
- [ ] Run `npm run db:push-schema` (creates tables)
- [ ] Verify tables in Neon dashboard
- [ ] Run data migration script (copies data from Supabase)
- [ ] Test application

