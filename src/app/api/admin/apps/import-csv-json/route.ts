import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireModerator } from "@/lib/admin";
import { Developer, MiniApp } from "@/db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_OWNER_ADDRESS = "0x0CF70E448ac98689e326bd79075a96CcBcec1665";

/**
 * Import apps from CSV-style JSON format (matches export-csv format)
 * This handles the format with fields like "App Name", "Developer Name", etc.
 */
export async function POST(request: NextRequest) {
  try {
    await requireModerator();

    const body = await request.json();
    const { jsonUrl, defaultDeveloperWallet } = body;

    if (!jsonUrl) {
      return NextResponse.json(
        { error: "jsonUrl is required" },
        { status: 400 }
      );
    }

    // Fetch JSON from URL
    let data: any;
    try {
      const response = await fetch(jsonUrl, {
        headers: {
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout for large files
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch JSON from URL: ${response.status} ${response.statusText}` },
          { status: 400 }
        );
      }

      data = await response.json();
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to fetch JSON: ${error.message}` },
        { status: 400 }
      );
    }

    // Validate data structure
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "JSON must be an array of app objects" },
        { status: 400 }
      );
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: "JSON array is empty" },
        { status: 400 }
      );
    }

    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    // Use provided wallet or default owner address
    const systemWallet = (defaultDeveloperWallet || DEFAULT_OWNER_ADDRESS).toLowerCase();

    // Get or create system developer
    let systemDeveloperResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, systemWallet))
      .limit(1);
    let systemDeveloper = systemDeveloperResult[0];

    if (!systemDeveloper) {
      const [newDeveloper] = await db.insert(Developer).values({
        wallet: systemWallet,
        name: "MiniCast Admin",
        verified: true,
      }).returning();
      systemDeveloper = newDeveloper;
    }

    // Process each app
    for (const appData of data) {
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
        // Tags field maps to app tags (not developerTags)
        const tags = tagsStr
          ? tagsStr.split(",").map((t: string) => t.trim().toLowerCase()).filter((t: string) => t.length > 0)
          : [];

        // Get or create developer
        let developer = systemDeveloper;
        if (developerWallet && /^0x[a-fA-F0-9]{40}$/i.test(developerWallet)) {
          const devWallet = developerWallet.toLowerCase();
          let foundDevResult = await db.select().from(Developer)
            .where(eq(Developer.wallet, devWallet))
            .limit(1);
          let foundDev = foundDevResult[0];

          if (!foundDev) {
            const [newDev] = await db.insert(Developer).values({
              wallet: devWallet,
              name: developerName || "Unknown",
              verified: appVerified,
            }).returning();
            foundDev = newDev;
          } else {
            // Update developer name if provided and different
            if (developerName && developerName !== "Unknown" && foundDev.name !== developerName) {
              await db.update(Developer)
                .set({ name: developerName })
                .where(eq(Developer.id, foundDev.id));
              foundDev.name = developerName;
            }
          }
          developer = foundDev;
        }

        // Normalize URL (remove trailing slash)
        const normalizedUrl = url.endsWith("/") ? url.slice(0, -1) : url;

        // Check if app exists
        const existingAppResult = await db.select().from(MiniApp)
          .where(eq(MiniApp.url, normalizedUrl))
          .limit(1);
        const existingApp = existingAppResult[0];

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
          tags: tags.slice(0, 10),
          screenshots: [],
          farcasterJson: farcasterJson,
          developerId: developer.id,
          status: status as "approved" | "pending" | "rejected",
          verified: appVerified,
          contractAddress: contractAddress,
          contractVerified: contractVerified,
          notesToAdmin: notesToAdmin || null,
          autoUpdated: true,
          lastUpdatedAt: new Date(),
        };

        if (existingApp) {
          // Update existing app
          await db.update(MiniApp)
            .set(appRecord)
            .where(eq(MiniApp.id, existingApp.id));
          updated++;
        } else {
          // Create new app
          await db.insert(MiniApp).values({
            ...appRecord,
            clicks: parseInt(appData["Clicks"] || appData.clicks || "0") || 0,
            installs: parseInt(appData["Installs"] || appData.installs || "0") || 0,
            launchCount: parseInt(appData["Launch Count"] || appData.launchCount || "0") || 0,
            uniqueUsers: parseInt(appData["Unique Users"] || appData.uniqueUsers || "0") || 0,
            popularityScore: parseInt(appData["Popularity Score"] || appData.popularityScore || "0") || 0,
            ratingAverage: parseFloat(appData["Rating Average"] || appData.ratingAverage || "0") || 0,
            ratingCount: parseInt(appData["Rating Count"] || appData.ratingCount || "0") || 0,
          });
          created++;
        }
      } catch (error: any) {
        console.error(`Error processing app ${appData["App Name"] || "unknown"}:`, error);
        errors.push(`Failed to process ${appData["App Name"] || "unknown"}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${data.length} apps from CSV-style JSON`,
      total: data.length,
      created,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("CSV JSON import error:", error);
    return NextResponse.json(
      {
        error: "Failed to import apps from CSV-style JSON",
        message: error.message || "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}

