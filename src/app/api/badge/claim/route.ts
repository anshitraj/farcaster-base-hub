import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { MiniApp, Developer, Badge } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { mintSBTWithPaymaster } from "@/lib/coinbase-api";
import { generateBadgeSVG, generateBadgeDesign, generateBadgeMetadata } from "@/lib/badge-generator";

const claimSchema = z.object({
  appId: z.string().uuid(),
});

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    if (!session || !session.wallet) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = claimSchema.parse(body);
    const wallet = session.wallet.toLowerCase();

    // Fetch app and developer
    const appData = await db.select({
      app: MiniApp,
      developer: {
        id: Developer.id,
        wallet: Developer.wallet,
        name: Developer.name,
      },
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(MiniApp.id, validated.appId))
      .limit(1);

    const result = appData[0];
    if (!result) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    const { app, developer } = result;

    // Verify app is approved
    if (app.status !== "approved") {
      return NextResponse.json(
        { error: "App must be approved before claiming badge" },
        { status: 400 }
      );
    }

    // Verify developer owns the app
    if (!developer || developer.wallet.toLowerCase() !== wallet) {
      return NextResponse.json(
        { error: "You can only claim badges for your own approved apps" },
        { status: 403 }
      );
    }

    // Check if badge already exists
    const existingBadge = await db.select()
      .from(Badge)
      .where(
        and(
          eq(Badge.appId, validated.appId),
          eq(Badge.developerId, developer.id)
        )
      )
      .limit(1);

    if (existingBadge.length > 0 && existingBadge[0].claimed) {
      return NextResponse.json(
        { error: "Badge already claimed", badge: existingBadge[0] },
        { status: 400 }
      );
    }

    // Generate unique badge design
    const design = generateBadgeDesign(app.name, app.category, app.iconUrl);
    const badgeSVG = generateBadgeSVG(app.name, app.category, design, app.iconUrl);

    // Convert SVG to data URL for metadata (Edge runtime compatible)
    const svgBase64 = typeof Buffer !== 'undefined' 
      ? Buffer.from(badgeSVG).toString('base64')
      : btoa(unescape(encodeURIComponent(badgeSVG)));
    const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`;

    // Generate metadata
    const metadata = generateBadgeMetadata(
      app.name,
      app.category,
      app.url,
      developer.wallet,
      svgDataUrl,
      app.id
    );

    // Save metadata to a URL (for MVP, use API endpoint; in production, use IPFS)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const metadataUri = `${baseUrl}/api/metadata/badge/${app.id}`;

    // Mint badge with Paymaster (gas-free)
    let txHash: string;
    try {
      txHash = await mintSBTWithPaymaster(
        developer.wallet,
        metadataUri,
        process.env.BADGE_CONTRACT_ADDRESS!
      );
    } catch (error: any) {
      console.error("Mint badge error:", error);
      return NextResponse.json(
        { error: `Failed to mint badge: ${error.message}` },
        { status: 500 }
      );
    }

    // Create or update badge record
    let badge;
    if (existingBadge.length > 0) {
      // Update existing badge
      const [updated] = await db.update(Badge)
        .set({
          claimed: true,
          txHash,
          metadataUri,
          claimedAt: new Date(),
        })
        .where(eq(Badge.id, existingBadge[0].id))
        .returning();
      badge = updated;
    } else {
      // Create new badge
      const [newBadge] = await db.insert(Badge).values({
        name: `${app.name} Builder Badge`,
        imageUrl: svgDataUrl,
        appName: app.name,
        appId: app.id,
        developerId: developer.id,
        txHash,
        claimed: true,
        metadataUri,
        claimedAt: new Date(),
      }).returning();
      badge = newBadge;
    }

    return NextResponse.json({
      success: true,
      badge,
      message: "Badge claimed successfully!",
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Claim badge error:", error);
    return NextResponse.json(
      { error: "Failed to claim badge" },
      { status: 500 }
    );
  }
}

