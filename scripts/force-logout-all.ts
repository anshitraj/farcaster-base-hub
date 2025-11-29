import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function forceLogoutAll() {
  try {
    const correctWallet = "0x2de9fc192ef7502e7113db457e01c058d25b32b";
    
    console.log("\n🔍 Force logging out all sessions...\n");

    // Delete ALL sessions for the correct wallet (user will need to log in again)
    const deleted = await prisma.userSession.deleteMany({
      where: {
        wallet: correctWallet.toLowerCase(),
      },
    });

    console.log(`✅ Deleted ${deleted.count} session(s) for correct wallet`);
    
    // Also delete any sessions with wrong wallet (just in case)
    const wrongWallet = "0x2de9fc192ef7502e7113db457e01cc058d25b32b";
    const deletedWrong = await prisma.userSession.deleteMany({
      where: {
        wallet: wrongWallet.toLowerCase(),
      },
    });

    if (deletedWrong.count > 0) {
      console.log(`✅ Also deleted ${deletedWrong.count} session(s) with wrong wallet`);
    }

    console.log("\n🎉 All sessions cleared!");
    console.log("\n💡 IMPORTANT - Do this now:");
    console.log("   1. Open browser DevTools (F12)");
    console.log("   2. Go to Application tab → Cookies → http://localhost:3000");
    console.log("   3. Delete ALL cookies (especially 'walletAddress' and 'sessionToken')");
    console.log("   4. Close and reopen the browser tab");
    console.log("   5. Connect your wallet again");
    console.log("   6. The API should now find the correct developer with ADMIN role");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

forceLogoutAll();

