-- Migration script to convert isAdmin to adminRole
-- Run this BEFORE running prisma db push

-- Step 1: Set adminRole = 'ADMIN' for all users where isAdmin = true
UPDATE "Developer"
SET "adminRole" = 'ADMIN'
WHERE "isAdmin" = true
  AND ("adminRole" IS NULL OR "adminRole" != 'ADMIN');

-- Step 2: Verify the migration
SELECT 
  wallet,
  "isAdmin",
  "adminRole",
  CASE 
    WHEN "isAdmin" = true AND "adminRole" = 'ADMIN' THEN '✓ Migrated'
    WHEN "isAdmin" = true AND "adminRole" IS NULL THEN '⚠️ Needs Migration'
    ELSE '✓ OK'
  END as status
FROM "Developer"
WHERE "isAdmin" = true OR "adminRole" IS NOT NULL;

