import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function verifyAdmin() {
  try {
    const wallet = process.env.ADMIN_WALLET;
    
    if (!wallet) {
      console.error("❌ ADMIN_WALLET not set");
      process.exit(1);
    }

    const walletLower = wallet.toLowerCase();
    console.log(`\n🔍 Checking wallet: ${walletLower}\n`);

    // Check what Prisma returns
    const developer = await prisma.developer.findUnique({
      where: { wallet: walletLower },
      select: {
        wallet: true,
        adminRole: true,
        name: true,
        verified: true,
      },
    });

    if (!developer) {
      console.error(`❌ Developer not found for wallet: ${walletLower}`);
      process.exit(1);
    }

    console.log("📊 Developer from database:");
    console.log(JSON.stringify(developer, null, 2));
    console.log(`\n✅ Admin Role: ${developer.adminRole || "null"}`);
    
    if (developer.adminRole === "ADMIN") {
      console.log("\n🎉 Admin role is correctly set!");
    } else {
      console.log("\n❌ Admin role is NOT set! Run: npm run seed:admin");
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAdmin();

