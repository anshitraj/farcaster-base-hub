import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchFarcasterMetadata, hashMetadata } from "@/lib/farcaster-metadata";
import { MiniApp } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, etc.)
// For security, you can add a secret token check
const CRON_SECRET = process.env.CRON_SECRET || "your-secret-token";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    // Optional: Verify cron secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch all approved apps
    const apps = await db.select({
      id: MiniApp.id,
      url: MiniApp.url,
      farcasterJson: MiniApp.farcasterJson,
      name: MiniApp.name,
    })
      .from(MiniApp)
      .where(inArray(MiniApp.status, ["approved", "auto_updated"]));

    let updatedCount = 0;
    const errors: string[] = [];

    for (const app of apps) {
      try {
        // Fetch latest metadata
        const metadata = await fetchFarcasterMetadata(app.url);
        
        if (!metadata) {
          continue; // Skip if metadata not found
        }

        // Ensure owner address is included
        const DEFAULT_OWNER_ADDRESS = "0x0CF70E448ac98689e326bd79075a96CcBcec1665";
        const metadataWithOwner = {
          ...metadata,
          owner: metadata.owner || metadata.owners || DEFAULT_OWNER_ADDRESS,
          owners: metadata.owners || metadata.owner || DEFAULT_OWNER_ADDRESS,
        };

        // Compare with existing metadata
        const existingMetadata = app.farcasterJson ? JSON.parse(app.farcasterJson) : null;
        const existingHash = existingMetadata ? hashMetadata(existingMetadata) : null;
        const newHash = hashMetadata(metadataWithOwner);

        // Only update if metadata changed
        if (existingHash !== newHash) {
          const screenshots = metadata.screenshots || [];
          const updateData: any = {
            farcasterJson: JSON.stringify(metadataWithOwner),
            lastUpdatedAt: new Date(),
            autoUpdated: true,
            status: "auto_updated",
          };
          
          if (metadata.name) updateData.name = metadata.name;
          if (metadata.description) updateData.description = metadata.description;
          if (metadata.icon) updateData.iconUrl = metadata.icon;
          if (metadata.category) updateData.category = metadata.category;
          if (screenshots.length > 0) updateData.screenshots = screenshots;
          
          await db.update(MiniApp)
            .set(updateData)
            .where(eq(MiniApp.id, app.id));

          updatedCount++;
        }
      } catch (error: any) {
        errors.push(`App ${app.id} (${app.name}): ${error.message}`);
        console.error(`Error updating app ${app.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: apps.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Cron update error:", error);
    return NextResponse.json(
      { error: "Failed to update apps", details: error.message },
      { status: 500 }
    );
  }
}

