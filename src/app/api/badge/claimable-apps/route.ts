import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { MiniApp, Developer, Badge } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    if (!session || !session.wallet) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const wallet = session.wallet.toLowerCase();

    // Get developer
    const developerResult = await db.select()
      .from(Developer)
      .where(eq(Developer.wallet, wallet))
      .limit(1);

    const developer = developerResult[0];
    if (!developer) {
      console.log(`[Badge API] No developer found for wallet: ${wallet}`);
      return NextResponse.json(
        { claimableApps: [], count: 0 },
        { status: 200 }
      );
    }

    console.log(`[Badge API] Developer found: ${developer.id}, wallet: ${developer.wallet}`);

    // Get all approved apps for this developer (for Cast Your App badges)
    const listedApps = await db.select({
      app: MiniApp,
    })
      .from(MiniApp)
      .where(
        and(
          eq(MiniApp.developerId, developer.id),
          eq(MiniApp.status, "approved")
        )
      );

    console.log(`[Badge API] Found ${listedApps.length} approved apps for developer`);

    // Get all apps where user is owner (for SBT badges)
    const allApprovedApps = await db.select({
      app: MiniApp,
    })
      .from(MiniApp)
      .where(eq(MiniApp.status, "approved"));

    const ownerApps: typeof allApprovedApps = [];
    for (const { app } of allApprovedApps) {
      if (app.farcasterJson) {
        try {
          const farcasterData = JSON.parse(app.farcasterJson);
          const owners = farcasterData.owner || farcasterData.owners || [];
          const ownerList = Array.isArray(owners) ? owners : [owners];
          const normalizedOwners = ownerList.map((owner: string) => 
            owner.toLowerCase().trim()
          );
          
          if (normalizedOwners.includes(wallet)) {
            ownerApps.push({ app });
          }
        } catch (e) {
          console.error(`Error parsing farcaster.json for app ${app.id}:`, e);
        }
      }
    }

    // Get all badges for this developer - use same pattern as my-badges route
    let badges: any[] = [];
    try {
      badges = await db.select({
        id: Badge.id,
        name: Badge.name,
        imageUrl: Badge.imageUrl,
        appName: Badge.appName,
        appId: Badge.appId,
        developerId: Badge.developerId,
        badgeType: Badge.badgeType,
        txHash: Badge.txHash,
        claimed: Badge.claimed,
        metadataUri: Badge.metadataUri,
        tokenId: Badge.tokenId,
        createdAt: Badge.createdAt,
        claimedAt: Badge.claimedAt,
      })
        .from(Badge)
        .where(eq(Badge.developerId, developer.id));
    } catch (badgeError: any) {
      console.error("[Badge API] Error querying badges:", badgeError);
      console.error("[Badge API] Developer ID:", developer.id);
      // If badge query fails, continue with empty array (no badges found)
      badges = [];
    }

    // Create sets of app IDs that already have CLAIMED badges (only exclude if already claimed)
    // Unclaimed badges don't block claiming - user can still claim
    // Handle null badgeType (defaults to "sbt" in schema)
    const appsWithSBTBadges = new Set(
      badges.filter(b => b.claimed === true && b.appId && (b.badgeType === "sbt" || !b.badgeType)).map(b => b.appId!)
    );
    const appsWithCastBadges = new Set(
      badges.filter(b => b.claimed === true && b.appId && b.badgeType === "cast_your_app").map(b => b.appId!)
    );
    
    console.log(`[Badge API] Badges found: ${badges.length}, SBT: ${appsWithSBTBadges.size}, Cast: ${appsWithCastBadges.size}`);

    // Build claimable apps with badge types
    const claimableApps: any[] = [];

    // Add Cast Your App badges (for apps the developer listed)
    for (const { app } of listedApps) {
      const alreadyHasBadge = appsWithCastBadges.has(app.id);
      console.log(`[Badge API] App ${app.name} (${app.id}): alreadyHasBadge=${alreadyHasBadge}`);
      
      // Show as claimable if no badge record exists (even if flag is set, we'll create the record)
      if (!alreadyHasBadge) {
        claimableApps.push({
          id: app.id,
          name: app.name,
          description: app.description,
          iconUrl: app.iconUrl,
          category: app.category,
          url: app.url,
          createdAt: app.createdAt,
          badgeType: "cast_your_app",
        });
      }
    }

    console.log(`[Badge API] Total claimable apps: ${claimableApps.length}`);

    // Add SBT badges (for apps where user is owner)
    for (const { app } of ownerApps) {
      if (!appsWithSBTBadges.has(app.id)) {
        claimableApps.push({
          id: app.id,
          name: app.name,
          description: app.description,
          iconUrl: app.iconUrl,
          category: app.category,
          url: app.url,
          createdAt: app.createdAt,
          badgeType: "sbt",
        });
      }
    }

    return NextResponse.json({
      claimableApps,
      count: claimableApps.length,
    });
  } catch (error) {
    console.error("Error fetching claimable apps:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: "Failed to fetch claimable apps",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

