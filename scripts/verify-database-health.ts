import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function verifyDatabaseHealth() {
  try {
    console.log("\n🔍 Verifying database health...\n");

    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connection: OK");

    // Count developers
    const developerCount = await prisma.developer.count();
    console.log(`✅ Total developers: ${developerCount}`);

    // Count apps
    const appCount = await prisma.miniApp.count();
    console.log(`✅ Total apps: ${appCount}`);

    // Count approved apps
    const approvedApps = await prisma.miniApp.count({
      where: { status: "approved" },
    });
    console.log(`✅ Approved apps: ${approvedApps}`);

    // Check for admins
    const adminCount = await prisma.developer.count({
      where: { adminRole: "ADMIN" },
    });
    console.log(`✅ Admin users: ${adminCount}`);

    // Check for moderators
    const moderatorCount = await prisma.developer.count({
      where: { adminRole: "MODERATOR" },
    });
    console.log(`✅ Moderator users: ${moderatorCount}`);

    // Check for duplicate wallets (should be 0)
    const duplicates = await prisma.$queryRaw<Array<{ wallet: string; count: number }>>`
      SELECT wallet, COUNT(*) as count
      FROM "Developer"
      GROUP BY wallet
      HAVING COUNT(*) > 1
    `;
    
    if (duplicates.length > 0) {
      console.log(`\n⚠️  Found ${duplicates.length} duplicate wallet(s):`);
      duplicates.forEach(dup => {
        console.log(`   - ${dup.wallet} (${dup.count} records)`);
      });
    } else {
      console.log(`✅ No duplicate wallets found`);
    }

    // Check for active sessions
    const activeSessions = await prisma.userSession.count({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
    });
    console.log(`✅ Active sessions: ${activeSessions}`);

    // List all admin wallets
    const admins = await prisma.developer.findMany({
      where: { adminRole: "ADMIN" },
      select: {
        wallet: true,
        name: true,
        verified: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (admins.length > 0) {
      console.log(`\n📋 Admin users:`);
      admins.forEach((admin, index) => {
        console.log(`   ${index + 1}. ${admin.wallet}`);
        console.log(`      Name: ${admin.name || "null"}`);
        console.log(`      Verified: ${admin.verified}`);
        console.log(`      Created: ${admin.createdAt.toISOString()}`);
      });
    }

    console.log("\n🎉 Database health check complete!");
    console.log("\n✅ Everything looks good!");
  } catch (error: any) {
    console.error("\n❌ Database health check failed:");
    console.error(`   Error: ${error.message}`);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabaseHealth();

