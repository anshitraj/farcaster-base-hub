import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminOnly } from "@/lib/admin";
import { Developer, MiniApp } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const importJsonSchema = z.object({
  jsonUrl: z.string().url("JSON URL must be valid"),
  developerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/i, "Invalid wallet address"),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdminOnly(); // JSON import is admin-only

    const body = await request.json();
    const validated = importJsonSchema.parse(body);

    // Fetch farcaster.json directly from the URL
    let metadata;
    try {
      const response = await fetch(validated.jsonUrl, {
        headers: {
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Failed to fetch JSON from URL: ${response.status} ${response.statusText}` },
          { status: 400 }
        );
      }

      metadata = await response.json();
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to fetch JSON: ${error.message}` },
        { status: 400 }
      );
    }

    // Validate metadata structure
    if (!metadata || typeof metadata !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON structure" },
        { status: 400 }
      );
    }

    // Ensure owner address is included
    const DEFAULT_OWNER_ADDRESS = "0x0CF70E448ac98689e326bd79075a96CcBcec1665";
    const metadataWithOwner = {
      ...metadata,
      owner: metadata.owner || metadata.owners || DEFAULT_OWNER_ADDRESS,
      owners: metadata.owners || metadata.owner || DEFAULT_OWNER_ADDRESS,
    };

    // Extract app URL from metadata or use the base URL from jsonUrl
    let appUrl = metadata.url;
    if (!appUrl) {
      // Try to extract base URL from jsonUrl
      try {
        const urlObj = new URL(validated.jsonUrl);
        appUrl = `${urlObj.protocol}//${urlObj.host}`;
      } catch {
        return NextResponse.json(
          { error: "Could not determine app URL from JSON or JSON URL" },
          { status: 400 }
        );
      }
    }

    // Ensure URL is valid
    try {
      new URL(appUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid app URL in metadata" },
        { status: 400 }
      );
    }

    // Try to fetch icon.png from /.well-known/ if icon is not in JSON
    let iconUrl = metadata.icon;
    if (!iconUrl) {
      try {
        const normalizedUrl = appUrl.replace(/\/$/, "");
        const iconPngUrl = `${normalizedUrl}/.well-known/icon.png`;
        const iconResponse = await fetch(iconPngUrl, {
          method: "HEAD", // Just check if it exists
          signal: AbortSignal.timeout(5000),
        });
        if (iconResponse.ok) {
          iconUrl = iconPngUrl;
        }
      } catch (e) {
        // Icon.png doesn't exist, will use placeholder
        console.log("icon.png not found at /.well-known/icon.png");
      }
    }

    const walletLower = validated.developerWallet.toLowerCase();
    // Find or create developer
    let developerResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, walletLower))
      .limit(1);
    let developer = developerResult[0];

    if (!developer) {
      const [created] = await db.insert(Developer).values({
        wallet: walletLower,
        name: metadata.developer?.name || null,
      }).returning();
      developer = created;
    }

    // Check if app already exists
    const existingAppResult = await db.select().from(MiniApp)
      .where(eq(MiniApp.url, appUrl))
      .limit(1);
    const existingApp = existingAppResult[0];

    if (existingApp) {
      return NextResponse.json(
        { error: "App with this URL already exists", app: existingApp },
        { status: 400 }
      );
    }

    // Create app from metadata
    const [app] = await db.insert(MiniApp).values({
      name: metadata.name || "Untitled App",
      description: metadata.description || "", // Allow empty description - can be edited later
      url: appUrl,
      iconUrl: iconUrl || "https://via.placeholder.com/512?text=App+Icon",
      category: metadata.category || "Utilities",
      developerTags: [],
      screenshots: Array.isArray(metadata.screenshots) ? metadata.screenshots : [],
      farcasterJson: JSON.stringify(metadataWithOwner),
      autoUpdated: true,
      status: "approved", // Admin-imported apps are auto-approved
      verified: true,
      developerId: developer.id,
      clicks: 0,
      installs: 0,
      launchCount: 0,
      uniqueUsers: 0,
      popularityScore: 0,
      ratingAverage: 0,
      ratingCount: 0,
      // Extract deep links if available
      baseMiniAppUrl: metadata.baseMiniAppUrl || metadata.deepLink?.base || null,
      farcasterUrl: metadata.farcasterUrl || metadata.deepLink?.farcaster || null,
    }).returning();
    
    // Fetch developer for response
    const developerData = await db.select().from(Developer)
      .where(eq(Developer.id, developer.id))
      .limit(1);
    const appWithDeveloper = { ...app, developer: developerData[0] };

    return NextResponse.json({
      success: true,
      app: appWithDeveloper,
      message: "App imported successfully from farcaster.json URL",
    });
  } catch (error: any) {
    if (error.message === "Admin access required") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("JSON import error:", error);
    return NextResponse.json(
      { error: "Failed to import app from JSON URL", details: error.message },
      { status: 500 }
    );
  }
}

