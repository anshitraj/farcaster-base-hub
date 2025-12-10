/**
 * Cleanup script to remove old badges from the previous contract
 * Run this to clear the database so users can claim new badges from the new contract
 */

// Load environment variables FIRST
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function cleanupOldBadges() {
  console.log("🧹 Starting cleanup of old badges...\n");

  try {
    // Dynamically import db after env vars are loaded
    const { db } = await import("../src/lib/db");
    const { Badge } = await import("../src/db/schema");

    // Get all badges
    const allBadges = await db.select().from(Badge);
    console.log(`📊 Found ${allBadges.length} total badges in database`);

    if (allBadges.length === 0) {
      console.log("✅ No badges to clean up!");
      return;
    }

    // Delete all badges (they're from the old contract)
    await db.delete(Badge);
    
    console.log(`\n✅ Successfully deleted all old badges!`);
    console.log(`📝 Users can now claim new badges from the new MiniCastBadgeSBT contract`);
    console.log(`\n🔗 New contract: ${process.env.BADGE_CONTRACT || "Set BADGE_CONTRACT in .env.local"}`);
  } catch (error: any) {
    console.error("❌ Error cleaning up badges:", error);
    throw error;
  }
}

// Run cleanup
cleanupOldBadges()
  .then(() => {
    console.log("\n🎉 Cleanup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Cleanup failed:", error);
    process.exit(1);
  });

