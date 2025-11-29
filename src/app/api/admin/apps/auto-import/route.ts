import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminOnly } from "@/lib/admin";
import { fetchFarcasterMetadata } from "@/lib/farcaster-metadata";
import { z } from "zod";

const importSchema = z.object({
  url: z.string().url("URL must be valid"),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdminOnly(); // Auto-import is admin-only

    const body = await request.json();
    const validated = importSchema.parse(body);

    // Fetch farcaster.json metadata
    const metadata = await fetchFarcasterMetadata(validated.url);

    if (!metadata) {
      return NextResponse.json(
        { error: "Could not fetch farcaster.json from the provided URL" },
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

    // Extract developer wallet from metadata or use default system wallet
    const developerWallet = Array.isArray(metadata.owner) 
      ? metadata.owner[0] 
      : (typeof metadata.owner === 'string' ? metadata.owner : DEFAULT_OWNER_ADDRESS);

    // Find or create developer
    let developer = await prisma.developer.findUnique({
      where: { wallet: developerWallet.toLowerCase() },
    });

    if (!developer) {
      developer = await prisma.developer.create({
        data: {
          wallet: developerWallet.toLowerCase(),
          name: metadata.developer?.name || "Unknown",
          verified: true, // Auto-imported apps get verified developer
        },
      });
    }

    // Extract homeUrl (frame homeUrl or fallback to provided URL)
    const normalizedUrl = validated.url.replace(/\/$/, "");
    const homeUrl = metadata.homeUrl || metadata.url || normalizedUrl;

    // Check if app already exists (by homeUrl)
    const existingApp = await prisma.miniApp.findUnique({
      where: { url: homeUrl },
    });

    if (existingApp) {
      return NextResponse.json(
        { error: "App with this URL already exists", app: existingApp },
        { status: 400 }
      );
    }

    // Get iconUrl from metadata (already processed by fetchFarcasterMetadata)
    // It handles relative paths and converts them to absolute
    let iconUrl = metadata.iconUrl || metadata.icon;
    
    // Final fallback if still no icon
    if (!iconUrl) {
      iconUrl = "https://via.placeholder.com/512?text=App+Icon";
    }

    // Extract other fields from metadata
    const appName = metadata.name || "Untitled App";
    const description = metadata.description || metadata.subtitle || "";
    const category = metadata.category || metadata.primaryCategory || "Utilities";
    const tags = metadata.tags || [];
    const screenshots = metadata.screenshotUrls || metadata.screenshots || [];
    const headerImageUrl = metadata.ogImage || null;
    
    // Don't use webhook URL for baseMiniAppUrl - use the original URL instead
    // The frameUrl is typically a webhook endpoint, not the app URL
    const frameUrl = metadata.frameUrl || null;
    const isWebhookUrl = frameUrl?.includes('/fc-webhook') || 
                        frameUrl?.includes('/webhook') ||
                        frameUrl?.includes('/frame');
    
    // Only set baseMiniAppUrl if it's not a webhook URL, otherwise use null
    // The app.url (homeUrl) will be used as the Base app URL
    const baseMiniAppUrl = (frameUrl && !isWebhookUrl) ? frameUrl : null;

    // Create app
    const app = await prisma.miniApp.create({
      data: {
        name: appName,
        description: description || `${appName} - A Farcaster mini app`,
        url: homeUrl, // This is the original URL - use for Base
        iconUrl: iconUrl,
        headerImageUrl: headerImageUrl,
        category: category,
        tags: Array.isArray(tags) ? tags.slice(0, 10) : [], // Limit to 10 tags
        developerTags: [],
        screenshots: Array.isArray(screenshots) ? screenshots.slice(0, 5) : [], // Limit to 5 screenshots
        baseMiniAppUrl: baseMiniAppUrl, // Only set if not a webhook URL
        farcasterUrl: normalizedUrl, // Store the original input URL for Farcaster
        farcasterJson: JSON.stringify(metadataWithOwner),
        autoUpdated: true,
        status: "approved", // Auto-imported apps are auto-approved
        verified: true,
        developerId: developer.id,
        clicks: 0,
        installs: 0,
        launchCount: 0,
        uniqueUsers: 0,
        popularityScore: 0,
        ratingAverage: 0,
        ratingCount: 0,
      },
      include: {
        developer: true,
      },
    });

    return NextResponse.json({
      success: true,
      app,
      message: "App auto-imported successfully from farcaster.json",
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

    console.error("Auto-import error:", error);
    return NextResponse.json(
      { error: "Failed to auto-import app", details: error.message },
      { status: 500 }
    );
  }
}

