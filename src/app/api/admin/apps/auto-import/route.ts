import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { fetchFarcasterMetadata } from "@/lib/farcaster-metadata";
import { z } from "zod";

const importSchema = z.object({
  url: z.string().url("URL must be valid"),
  developerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address"),
});

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

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

    // Find or create developer
    let developer = await prisma.developer.findUnique({
      where: { wallet: validated.developerWallet.toLowerCase() },
    });

    if (!developer) {
      developer = await prisma.developer.create({
        data: {
          wallet: validated.developerWallet.toLowerCase(),
          name: metadata.developer?.name || null,
        },
      });
    }

    // Check if app already exists
    const existingApp = await prisma.miniApp.findUnique({
      where: { url: validated.url },
    });

    if (existingApp) {
      return NextResponse.json(
        { error: "App with this URL already exists", app: existingApp },
        { status: 400 }
      );
    }

    // Try to fetch icon.png from /.well-known/ if icon is not in JSON
    let iconUrl = metadata.icon;
    if (!iconUrl) {
      try {
        const normalizedUrl = validated.url.replace(/\/$/, "");
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

    // Create app
    const app = await prisma.miniApp.create({
      data: {
        name: metadata.name || "Untitled App",
        description: metadata.description || "", // Allow empty description - can be edited later
        url: validated.url,
        iconUrl: iconUrl || "https://via.placeholder.com/512?text=App+Icon",
        category: metadata.category || "Utilities",
        developerTags: [], // Can be extracted from metadata if available
        screenshots: metadata.screenshots || [],
        farcasterJson: JSON.stringify(metadata),
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

