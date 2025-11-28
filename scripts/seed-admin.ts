import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedAdmin() {
  const adminWallet = process.env.ADMIN_WALLET;

  if (!adminWallet) {
    console.error("❌ ADMIN_WALLET environment variable is not set");
    console.log("\n💡 To create an admin account:");
    console.log("1. Add ADMIN_WALLET=0x... to your .env file");
    console.log("2. Run: npm run seed:admin");
    process.exit(1);
  }

  try {
    console.log("🔍 Checking for existing admin...");

    let developer = await prisma.developer.findUnique({
      where: { wallet: adminWallet.toLowerCase() },
    });

    if (developer) {
      // Update existing developer to admin
      developer = await prisma.developer.update({
        where: { wallet: adminWallet.toLowerCase() },
        data: {
          adminRole: "ADMIN",
          verified: true,
          verificationStatus: "verified",
        },
      });
      console.log("✅ Updated existing developer to admin");
    } else {
      // Create new admin developer
      developer = await prisma.developer.create({
        data: {
          wallet: adminWallet.toLowerCase(),
          adminRole: "ADMIN",
          verified: true,
          verificationStatus: "verified",
        },
      });
      console.log("✅ Created new admin developer");
    }

    console.log("\n🎉 Admin account created/updated:");
    console.log(`   Wallet: ${developer.wallet}`);
    console.log(`   Admin Role: ${developer.adminRole || "None"}`);
    console.log(`   Verified: ${developer.verified}`);
    console.log("\n✨ You can now access /admin pages");
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();

