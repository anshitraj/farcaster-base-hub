# Data Migration Instructions: Supabase → Neon

## ✅ Step 1: Schema Created Successfully!

Your Neon database now has all tables created. Great job!

## 📋 Step 2: Set Up Environment Variables

In your `.env.local` file, you need to set:

```bash
# Your Supabase connection string (source - where data comes from)
OLD_DATABASE_URL="postgresql://postgres.bxubjfdkrljzuvwiyjrl:Bleedingedge20030@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"

# Your Neon connection string (target - where data goes to)
NEW_DATABASE_URL="postgresql://neondb_owner:npg_dnkA0Z2rsIqF@ep-mute-brook-aet0nel1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Or NEW_DATABASE_URL can be omitted if DATABASE_URL is already set to Neon
DATABASE_URL="postgresql://neondb_owner:npg_dnkA0Z2rsIqF@ep-mute-brook-aet0nel1-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```

**Important:** 
- `OLD_DATABASE_URL` = Your **Supabase** database (where your data currently is)
- `NEW_DATABASE_URL` = Your **Neon** database (where data will be copied to)
- If `NEW_DATABASE_URL` is not set, it will use `DATABASE_URL` (which should be Neon)

## 🚀 Step 3: Run Data Migration

Once both URLs are set in `.env.local`, run:

```bash
node scripts/migrate-to-neon.js
```

This will:
1. ✅ Connect to both databases
2. ✅ Export all data from Supabase (22 tables)
3. ✅ Import data into Neon
4. ✅ Validate row counts match
5. ✅ Show a summary report

## 📊 What Gets Migrated

The script migrates all 22 tables in this order (respecting foreign keys):

1. Developer
2. MiniApp
3. Badge
4. Review
5. AppEvent
6. UserSession
7. UserPoints
8. PointsTransaction
9. XPLog
10. AppLaunchEvent
11. PremiumSubscription
12. AccessCode
13. PremiumApp
14. BoostRequest
15. Collection
16. CollectionItem
17. UserProfile
18. AnalyticsEvent
19. Notification
20. Advertisement
21. Referral
22. TopBaseApps

## ⚠️ Troubleshooting

### Error: "OLD_DATABASE_URL is not set"
- Make sure `OLD_DATABASE_URL` is uncommented in `.env.local`
- Verify it's your Supabase connection string

### Error: "ENOTFOUND" or connection errors
- Check your Supabase database is not paused
- Verify connection strings are correct
- Ensure SSL mode is set: `?sslmode=require`

### Error: "relation does not exist" in Neon
- Make sure you ran `npm run db:push-schema` first (you already did this ✅)
- Verify `NEW_DATABASE_URL` points to Neon, not Supabase

### Migration partially fails
- The script uses `ON CONFLICT DO NOTHING` to avoid duplicates
- If some tables fail, you can re-run the script (it's idempotent)
- Check the summary at the end to see which tables succeeded

## ✅ After Migration

1. **Verify in Neon Dashboard:**
   - Check that row counts match Supabase
   - Test a few queries to ensure data integrity

2. **Test Your Application:**
   - All API routes should now work
   - Data should be accessible
   - No more "relation does not exist" errors

3. **Optional: Keep Supabase as Backup**
   - Don't delete Supabase data immediately
   - Keep it as a backup for a few days
   - Once confident, you can remove Supabase

## 🎉 Success!

Once migration completes successfully, your application will be fully running on Neon with Edge Runtime support!

