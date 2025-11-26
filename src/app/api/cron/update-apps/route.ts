import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchFarcasterMetadata, hashMetadata } from "@/lib/farcaster-metadata";

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, etc.)
// For security, you can add a secret token check
const CRON_SECRET = process.env.CRON_SECRET || "your-secret-token";

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
    const apps = await prisma.miniApp.findMany({
      where: {
        status: {
          in: ["approved", "auto_updated"],
        },
      },
      select: {
        id: true,
        url: true,
        farcasterJson: true,
        name: true,
      },
    });

    let updatedCount = 0;
    const errors: string[] = [];

    for (const app of apps) {
      try {
        // Fetch latest metadata
        const metadata = await fetchFarcasterMetadata(app.url);
        
        if (!metadata) {
          continue; // Skip if metadata not found
        }

        // Compare with existing metadata
        const existingMetadata = app.farcasterJson ? JSON.parse(app.farcasterJson) : null;
        const existingHash = existingMetadata ? hashMetadata(existingMetadata) : null;
        const newHash = hashMetadata(metadata);

        // Only update if metadata changed
        if (existingHash !== newHash) {
          const screenshots = metadata.screenshots || [];
          
          await prisma.miniApp.update({
            where: { id: app.id },
            data: {
              name: metadata.name || app.name,
              description: metadata.description || undefined,
              iconUrl: metadata.icon || undefined,
              category: metadata.category || undefined,
              screenshots: screenshots,
              farcasterJson: JSON.stringify(metadata),
              lastUpdatedAt: new Date(),
              autoUpdated: true,
              status: "auto_updated",
            },
          });

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

