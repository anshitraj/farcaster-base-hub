import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function checkAllDevelopers() {
  try {
    const wallet = process.env.ADMIN_WALLET?.toLowerCase();
    
    if (!wallet) {
      console.error("❌ ADMIN_WALLET not set");
      process.exit(1);
    }

    console.log(`\n🔍 Checking for ALL developers with wallet: ${wallet}\n`);

    // Check if there are multiple records (shouldn't happen, but let's verify)
    const allDevelopers = await prisma.developer.findMany({
      where: {
        wallet: {
          contains: wallet.slice(0, 10), // Check for similar wallets
        }
      },
      select: {
        wallet: true,
        adminRole: true,
        name: true,
        verified: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`Found ${allDevelopers.length} developer(s):\n`);
    allDevelopers.forEach((dev, index) => {
      console.log(`${index + 1}. Wallet: ${dev.wallet}`);
      console.log(`   Admin Role: ${dev.adminRole || "null"}`);
      console.log(`   Name: ${dev.name || "null"}`);
      console.log(`   Verified: ${dev.verified}`);
      console.log(`   Created: ${dev.createdAt}`);
      console.log(`   Match: ${dev.wallet.toLowerCase() === wallet ? "✅ EXACT MATCH" : "❌ NO MATCH"}`);
      console.log();
    });

    // Check the exact match
    const exactMatch = await prisma.developer.findUnique({
      where: { wallet },
      select: {
        wallet: true,
        adminRole: true,
        name: true,
        verified: true,
      },
    });

    if (exactMatch) {
      console.log("✅ Exact match found:");
      console.log(JSON.stringify(exactMatch, null, 2));
      if (exactMatch.adminRole === "ADMIN") {
        console.log("\n🎉 Admin role is correctly set!");
      } else {
        console.log("\n❌ Admin role is NOT set! Run: npm run seed:admin");
      }
    } else {
      console.log(`\n❌ No exact match found for wallet: ${wallet}`);
      console.log("   This might be why the API returns null!");
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllDevelopers();

