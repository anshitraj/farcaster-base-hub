/**
 * Migration script to convert existing isAdmin boolean to adminRole enum
 * Run this script after updating the schema to migrate existing admin users
 * 
 * Usage: npx tsx scripts/migrate-admin-roles.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateAdminRoles() {
  try {
    console.log("Starting admin role migration...");

    // First, check if isAdmin column still exists
    // If it does, migrate all isAdmin = true to adminRole = 'ADMIN'
    const result = await prisma.$executeRaw`
      UPDATE "Developer"
      SET "adminRole" = 'ADMIN'
      WHERE "isAdmin" = true
        AND ("adminRole" IS NULL OR "adminRole" != 'ADMIN')
    `.catch((error: any) => {
      // If isAdmin column doesn't exist, that's okay - we'll just update based on what we can
      if (error.message?.includes('column "isAdmin" does not exist')) {
        console.log("isAdmin column doesn't exist - skipping migration");
        return 0;
      }
      throw error;
    });

    console.log(`Migrated ${result} admin users to adminRole = 'ADMIN'`);

    // Also ensure any existing admins without isAdmin but should be admins are set
    // This is a safety check - you can manually set specific wallets here
    const manualAdmins: string[] = [
      // Add your wallet addresses here if needed
      // Example: "0x1234567890123456789012345678901234567890"
    ];

    if (manualAdmins.length > 0) {
      const manualResult = await prisma.developer.updateMany({
        where: {
          wallet: {
            in: manualAdmins.map(w => w.toLowerCase()),
          },
          adminRole: null,
        },
        data: {
          adminRole: "ADMIN",
        },
      });
      console.log(`Manually set ${manualResult.count} additional admins`);
    }

    // Show current admin count
    const adminCount = await prisma.developer.count({
      where: { adminRole: "ADMIN" },
    });
    const moderatorCount = await prisma.developer.count({
      where: { adminRole: "MODERATOR" },
    });

    console.log("\nMigration complete!");
    console.log(`Total Admins: ${adminCount}`);
    console.log(`Total Moderators: ${moderatorCount}`);

  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrateAdminRoles();

