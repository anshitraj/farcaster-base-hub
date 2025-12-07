import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { mintBadge } from "@/lib/badgeContract";
import { MiniApp, Developer, Badge } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const mintSchema = z.object({
  developerWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  appId: z.string().uuid(),
  badgeType: z.enum(["sbt", "cast_your_app"]), // "sbt" for owner badges, "cast_your_app" for lister badges
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    const body = await request.json();
    const validated = mintSchema.parse(body);

    // Authenticate: only allow if session wallet == developerWallet OR admin
    if (!session || session.wallet.toLowerCase() !== validated.developerWallet.toLowerCase()) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Fetch app and developer
    const appResult = await db.select({
      app: MiniApp,
      developer: Developer,
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(MiniApp.id, validated.appId))
      .limit(1);
    const appData = appResult[0];
    if (!appData) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }
    const app = { ...appData.app, developer: appData.developer };

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    const wallet = validated.developerWallet.toLowerCase();
    
    // Check if wallet is the owner (from farcaster.json)
    let isOwner = false;
    if (app.farcasterJson) {
      try {
        const farcasterData = JSON.parse(app.farcasterJson);
        const owners = farcasterData.owner || farcasterData.owners || [];
        const ownerList = Array.isArray(owners) ? owners : [owners];
        const normalizedOwners = ownerList.map((owner: string) => 
          owner.toLowerCase().trim()
        );
        
        if (normalizedOwners.includes(wallet)) {
          isOwner = true;
        }
      } catch (e) {
        console.error("Error parsing farcaster.json:", e);
      }
    }
    
    // Check if wallet is the developer who listed the app
    const isLister = app.developer?.wallet.toLowerCase() === wallet;
    
    // Validate badge type eligibility
    if (validated.badgeType === "sbt") {
      // SBT badge: only for owners from farcaster.json
      if (!isOwner) {
        return NextResponse.json(
          { error: "You are not the owner of this app. Your wallet must be in the farcaster.json owner field to claim the SBT badge." },
          { status: 403 }
        );
      }
    } else if (validated.badgeType === "cast_your_app") {
      // Cast Your App badge: only for developers who listed the app
      if (!isLister) {
        return NextResponse.json(
          { error: "You are not the developer who listed this app. Only the app lister can claim the 'Cast Your App' badge." },
          { status: 403 }
        );
      }
      
      // App must be approved for Cast Your App badge
      if (app.status !== "approved") {
        return NextResponse.json(
          { error: "App must be approved before you can claim the 'Cast Your App' badge." },
          { status: 403 }
        );
      }
    }
    
    // Check if user already has this badge type for this app
    if (!app.developer) {
      return NextResponse.json(
        { error: "Developer not found for this app" },
        { status: 404 }
      );
    }
    
    const existingBadge = await db.select()
      .from(Badge)
      .where(
        and(
          eq(Badge.appId, validated.appId),
          eq(Badge.developerId, app.developer.id),
          eq(Badge.badgeType, validated.badgeType),
          eq(Badge.claimed, true)
        )
      )
      .limit(1);
    
    if (existingBadge.length > 0) {
      return NextResponse.json(
        { error: `You have already claimed the ${validated.badgeType === "sbt" ? "SBT" : "Cast Your App"} badge for this app.` },
        { status: 400 }
      );
    }

    // Build metadata JSON based on badge type
    const badgeName = validated.badgeType === "sbt" 
      ? `Built ${app.name} on Base`
      : `Cast Your App: ${app.name}`;
    const badgeDescription = validated.badgeType === "sbt"
      ? `SBT badge for owning ${app.name} on Base`
      : `Cast Your App badge for listing ${app.name} on Base`;
    
    const metadata = {
      name: badgeName,
      description: badgeDescription,
      image: app.iconUrl,
      attributes: [
        { trait_type: "App Name", value: app.name },
        { trait_type: "Developer", value: app.developer.wallet },
        { trait_type: "App URL", value: app.url },
        { trait_type: "Badge Type", value: validated.badgeType },
        { trait_type: "Created", value: app.createdAt.toISOString() },
      ],
    };

    // For MVP, use a simple HTTPS URL pattern
    // In production, you'd upload to IPFS or use a metadata service
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const metadataUri = `${baseUrl}/api/metadata/badge/${app.id}`;

    // Mint badge
    let txHash: string;
    try {
      txHash = await mintBadge(validated.developerWallet, metadataUri);
    } catch (error) {
      console.error("Mint badge error:", error);
      return NextResponse.json(
        { error: "Failed to mint badge. Check contract configuration." },
        { status: 500 }
      );
    }

    // Create badge record
    const [badge] = await db.insert(Badge).values({
      name: badgeName,
      imageUrl: app.iconUrl,
      appName: app.name,
      appId: app.id,
      developerId: app.developer.id,
      badgeType: validated.badgeType,
      txHash,
      claimed: true,
      claimedAt: new Date(),
    }).returning();

    return NextResponse.json({ badge }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Mint badge error:", error);
    return NextResponse.json(
      { error: "Failed to mint badge" },
      { status: 500 }
    );
  }
}

