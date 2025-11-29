import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

// Load environment variables
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function setAdminForWallet() {
  try {
    // The wallet that's actually being used (with extra 'c')
    const wallet = "0x2de9fc192ef7502e7113db457e01cc058d25b32b";
    
    console.log(`\n🔍 Setting admin role for wallet: ${wallet}\n`);

    let developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
    });

    if (!developer) {
      // Create developer with admin role
      developer = await prisma.developer.create({
        data: {
          wallet: wallet.toLowerCase(),
          adminRole: "ADMIN",
          verified: true,
          verificationStatus: "verified",
        },
      });
      console.log("✅ Created new developer with ADMIN role");
    } else {
      // Update existing developer to admin
      developer = await prisma.developer.update({
        where: { wallet: wallet.toLowerCase() },
        data: {
          adminRole: "ADMIN",
          verified: true,
          verificationStatus: "verified",
        },
      });
      console.log("✅ Updated existing developer to ADMIN");
    }

    console.log("\n🎉 Admin account set:");
    console.log(`   Wallet: ${developer.wallet}`);
    console.log(`   Admin Role: ${developer.adminRole || "None"}`);
    console.log(`   Verified: ${developer.verified}`);
    console.log("\n✨ Admin Portal should now appear after refresh!");
  } catch (error: any) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminForWallet();

