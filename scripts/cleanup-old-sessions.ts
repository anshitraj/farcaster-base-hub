import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function cleanupSessions() {
  try {
    const wrongWallet = "0x2de9fc192ef7502e7113db457e01cc058d25b32b"; // Wrong wallet (with extra 'c')
    const correctWallet = "0x2de9fc192ef7502e7113db457e01c058d25b32b"; // Correct wallet
    
    console.log("\n🔍 Cleaning up old sessions...\n");

    // Find sessions with wrong wallet
    const wrongSessions = await prisma.userSession.findMany({
      where: {
        wallet: wrongWallet.toLowerCase(),
      },
    });

    console.log(`Found ${wrongSessions.length} session(s) with wrong wallet`);
    
    if (wrongSessions.length > 0) {
      await prisma.userSession.deleteMany({
        where: {
          wallet: wrongWallet.toLowerCase(),
        },
      });
      console.log("✅ Deleted old sessions with wrong wallet");
    }

    // Verify correct wallet has sessions
    const correctSessions = await prisma.userSession.findMany({
      where: {
        wallet: correctWallet.toLowerCase(),
      },
    });

    console.log(`\n✅ Found ${correctSessions.length} session(s) with correct wallet`);
    
    if (correctSessions.length === 0) {
      console.log("\n⚠️  No active sessions found for correct wallet.");
      console.log("   User will need to log in again.");
    } else {
      console.log("\n✅ Active sessions exist for correct wallet!");
    }

    console.log("\n🎉 Cleanup complete!");
    console.log("\n💡 Next steps:");
    console.log("   1. Clear browser cookies (or use incognito mode)");
    console.log("   2. Log out and log back in");
    console.log("   3. The API should now find the correct developer with ADMIN role");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupSessions();

