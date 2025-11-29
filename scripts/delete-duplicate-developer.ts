import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function deleteDuplicate() {
  try {
    // The duplicate wallet (with extra 'c')
    const duplicateWallet = "0x2de9fc192ef7502e7113db457e01cc058d25b32b";
    
    console.log(`\n🔍 Checking for duplicate developer: ${duplicateWallet}\n`);

    const duplicate = await prisma.developer.findUnique({
      where: { wallet: duplicateWallet.toLowerCase() },
      include: {
        apps: true,
        badges: true,
      },
    });

    if (!duplicate) {
      console.log("✅ No duplicate found - all good!");
      return;
    }

    console.log("❌ Found duplicate developer:");
    console.log(`   Wallet: ${duplicate.wallet}`);
    console.log(`   Admin Role: ${duplicate.adminRole || "null"}`);
    console.log(`   Apps: ${duplicate.apps.length}`);
    console.log(`   Badges: ${duplicate.badges.length}`);

    if (duplicate.apps.length > 0 || duplicate.badges.length > 0) {
      console.log("\n⚠️  WARNING: This developer has apps or badges!");
      console.log("   You may want to migrate them first.");
      console.log("   Proceeding with deletion anyway...\n");
    }

    // Delete the duplicate
    await prisma.developer.delete({
      where: { wallet: duplicateWallet.toLowerCase() },
    });

    console.log("✅ Duplicate developer deleted successfully!");
    console.log("\n🎉 Now the API should find the correct developer with ADMIN role!");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteDuplicate();

