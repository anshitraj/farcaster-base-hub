import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    const wallet = process.env.ADMIN_WALLET;
    
    if (!wallet) {
      console.error("❌ ADMIN_WALLET not set in .env");
      process.exit(1);
    }

    const developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
      select: {
        wallet: true,
        name: true,
        adminRole: true,
        verified: true,
      },
    });

    if (!developer) {
      console.error(`❌ Developer not found for wallet: ${wallet}`);
      process.exit(1);
    }

    console.log("\n📊 Developer Record:");
    console.log(`   Wallet: ${developer.wallet}`);
    console.log(`   Name: ${developer.name || "null"}`);
    console.log(`   Admin Role: ${developer.adminRole || "null"}`);
    console.log(`   Verified: ${developer.verified}`);
    
    if (developer.adminRole === "ADMIN" || developer.adminRole === "MODERATOR") {
      console.log("\n✅ Admin role is set correctly!");
    } else {
      console.log("\n❌ Admin role is NOT set!");
      console.log("   Run: npm run seed:admin");
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();

