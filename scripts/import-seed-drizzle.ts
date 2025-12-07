import { db } from "../src/lib/db";
import { config } from "dotenv";
import { resolve } from "path";
import { readFile } from "fs/promises";
import { Developer, MiniApp } from "../src/db/schema";
import { eq } from "drizzle-orm";

// Load environment variables from .env.local (takes precedence) or .env
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const DEFAULT_OWNER_ADDRESS = "0x0CF70E448ac98689e326bd79075a96CcBcec1665";

async function importSeed() {
  try {
    console.log("📦 Starting seed import with Drizzle ORM...\n");

    // Check DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error("❌ DATABASE_URL is not set!");
      console.log("\n💡 Create a .env.local file with:");
      console.log("   DATABASE_URL=\"postgresql://user:password@host:port/database\"");
      process.exit(1);
    }

    // Read seed file from public/seed directory
    const seedFilePath = resolve(process.cwd(), "public", "seed", "miniapps-seed.json");
    
    let data: any[];
    try {
      const fileContent = await readFile(seedFilePath, "utf-8");
      data = JSON.parse(fileContent);
    } catch (error: any) {
      console.error("❌ Failed to read seed file:", error.message);
      console.log(`\n💡 Make sure the file exists at: ${seedFilePath}`);
      process.exit(1);
    }

    // Validate data structure
    if (!Array.isArray(data)) {
      console.error("❌ Seed file must be an array of app objects");
      process.exit(1);
    }

    if (data.length === 0) {
      console.error("❌ Seed file is empty");
      process.exit(1);
    }

    console.log(`📊 Found ${data.length} apps in seed file\n`);

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    // Use default owner address
    const systemWallet = DEFAULT_OWNER_ADDRESS.toLowerCase();

    // Get or create system developer
    const [existingDeveloper] = await db
      .select()
      .from(Developer)
      .where(eq(Developer.wallet, systemWallet))
      .limit(1);

    let systemDeveloperId: string;

    if (!existingDeveloper) {
      const [newDeveloper] = await db
        .insert(Developer)
        .values({
          wallet: systemWallet,
          name: "System",
          verified: true,
        })
        .returning({ id: Developer.id });
      systemDeveloperId = newDeveloper.id;
      console.log("✅ Created system developer");
    } else {
      systemDeveloperId = existingDeveloper.id;
      console.log("✅ Using existing system developer");
    }

    console.log("\n🔄 Processing apps...\n");

    // Process each app
    for (let i = 0; i < data.length; i++) {
      const appData = data[i];
      try {
        // Map CSV-style fields to database fields
        const appName = appData["App Name"] || appData.name || "Untitled App";
        const developerName = appData["Developer Name"] || appData.developerName || "Unknown";
        const developerWallet = (appData["Developer Wallet"] || appData.developerWallet || "").trim();
        const url = (appData["URL"] || appData.url || "").trim();
        const baseMiniAppUrl = (appData["Base Mini App URL"] || appData.baseMiniAppUrl || "").trim() || null;
        const farcasterUrl = (appData["Farcaster URL"] || appData.farcasterUrl || "").trim() || null;
        const category = appData["Category"] || appData.category || "Utilities";
        const tagsStr = appData["Tags"] || appData.tags || "";
        const contractAddress = (appData["Contract Address"] || appData.contractAddress || "").trim() || null;
        const contractVerified = appData["Contract Verified"] === "Yes" || appData.contractVerified === true;
        const appVerified = appData["App Verified"] === "Yes" || appData.appVerified === true;
        const status = appData["Status"] || appData.status || "approved";
        const notesToAdmin = appData["Notes to Admin"] || appData.notesToAdmin || "";

        // Validate required fields
        if (!url || url === "") {
          errors.push(`Skipped "${appName}": URL is required`);
          continue;
        }

        // Validate URL format
        try {
          new URL(url);
        } catch {
          errors.push(`Skipped "${appName}": Invalid URL format`);
          continue;
        }

        // Parse tags (comma-separated string to array)
        const tags = tagsStr
          ? tagsStr.split(",").map((t: string) => t.trim().toLowerCase()).filter((t: string) => t.length > 0).slice(0, 5)
          : [];

        // Get or create developer
        let developerId = systemDeveloperId;
        if (developerWallet && /^0x[a-fA-F0-9]{40}$/i.test(developerWallet)) {
          const devWallet = developerWallet.toLowerCase();
          const [foundDev] = await db
            .select()
            .from(Developer)
            .where(eq(Developer.wallet, devWallet))
            .limit(1);

          if (!foundDev) {
            const [newDev] = await db
              .insert(Developer)
              .values({
                wallet: devWallet,
                name: developerName || "Unknown",
                verified: appVerified,
              })
              .returning({ id: Developer.id });
            developerId = newDev.id;
          } else {
            developerId = foundDev.id;
            // Update developer name if provided and different
            if (developerName && developerName !== "Unknown" && foundDev.name !== developerName) {
              await db
                .update(Developer)
                .set({ name: developerName })
                .where(eq(Developer.id, foundDev.id));
            }
          }
        }

        // Normalize URL (remove trailing slash)
        const normalizedUrl = url.endsWith("/") ? url.slice(0, -1) : url;

        // Check if app exists
        const [existingApp] = await db
          .select()
          .from(MiniApp)
          .where(eq(MiniApp.url, normalizedUrl))
          .limit(1);

        // Create farcasterJson with owner address
        const farcasterJson = JSON.stringify({
          owner: DEFAULT_OWNER_ADDRESS,
          owners: DEFAULT_OWNER_ADDRESS,
          name: appName,
          description: notesToAdmin || `${appName} - A Farcaster mini app`,
        });

        const appRecord = {
          name: appName.substring(0, 100),
          description: (notesToAdmin || `${appName} - A Farcaster mini app on Base`).substring(0, 500),
          url: normalizedUrl,
          farcasterUrl: farcasterUrl || normalizedUrl,
          baseMiniAppUrl: baseMiniAppUrl,
          iconUrl: "/placeholder-icon.png", // Will be updated when farcaster.json is fetched
          category: category,
          tags: tags,
          screenshots: [],
          farcasterJson: farcasterJson,
          developerId: developerId,
          status: status as "approved" | "pending" | "rejected",
          verified: appVerified,
          contractAddress: contractAddress,
          contractVerified: contractVerified,
          notesToAdmin: notesToAdmin || null,
          autoUpdated: true,
          lastUpdatedAt: new Date(),
          clicks: parseInt(appData["Clicks"] || appData.clicks || "0") || 0,
          installs: parseInt(appData["Installs"] || appData.installs || "0") || 0,
          launchCount: parseInt(appData["Launch Count"] || appData.launchCount || "0") || 0,
          uniqueUsers: parseInt(appData["Unique Users"] || appData.uniqueUsers || "0") || 0,
          popularityScore: parseInt(appData["Popularity Score"] || appData.popularityScore || "0") || 0,
          ratingAverage: parseFloat(appData["Rating Average"] || appData.ratingAverage || "0") || 0,
          ratingCount: parseInt(appData["Rating Count"] || appData.ratingCount || "0") || 0,
        };

        if (existingApp) {
          // Update existing app
          await db
            .update(MiniApp)
            .set(appRecord)
            .where(eq(MiniApp.id, existingApp.id));
          updated++;
          if ((i + 1) % 10 === 0) {
            process.stdout.write(`\r   Processed ${i + 1}/${data.length} apps... (${created} created, ${updated} updated)`);
          }
        } else {
          // Create new app
          await db.insert(MiniApp).values(appRecord);
          created++;
          if ((i + 1) % 10 === 0) {
            process.stdout.write(`\r   Processed ${i + 1}/${data.length} apps... (${created} created, ${updated} updated)`);
          }
        }
      } catch (error: any) {
        console.error(`\n❌ Error processing app ${appData["App Name"] || "unknown"}:`, error.message);
        errors.push(`Failed to process ${appData["App Name"] || "unknown"}: ${error.message}`);
      }
    }

    console.log(`\r   Processed ${data.length}/${data.length} apps... (${created} created, ${updated} updated)`);
    console.log("\n");

    // Print summary
    console.log("✅ Import completed!\n");
    console.log(`📊 Summary:`);
    console.log(`   Total apps: ${data.length}`);
    console.log(`   Created: ${created}`);
    console.log(`   Updated: ${updated}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  Errors (${errors.length}):`);
      errors.slice(0, 10).forEach((error) => console.log(`   - ${error}`));
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }

    console.log("\n🎉 Seed data imported successfully!");
    process.exit(0);
  } catch (error: any) {
    console.error("\n❌ Import error:", error);
    process.exit(1);
  }
}

importSeed();

