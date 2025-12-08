import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { MiniApp, Developer, Badge } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

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
      return NextResponse.json({
        earned: [],
        claimable: [],
      });
    }

    // Get all earned (claimed) badges - select only columns that exist
    const earnedBadges = await db.select({
      badge: {
        id: Badge.id,
        name: Badge.name,
        imageUrl: Badge.imageUrl,
        appName: Badge.appName,
        appId: Badge.appId,
        developerId: Badge.developerId,
        txHash: Badge.txHash,
        claimed: Badge.claimed,
        metadataUri: Badge.metadataUri,
        tokenId: Badge.tokenId,
        createdAt: Badge.createdAt,
        claimedAt: Badge.claimedAt,
      },
      app: {
        id: MiniApp.id,
        name: MiniApp.name,
        iconUrl: MiniApp.iconUrl,
        category: MiniApp.category,
        url: MiniApp.url,
      },
    })
      .from(Badge)
      .leftJoin(MiniApp, eq(Badge.appId, MiniApp.id))
      .where(
        and(
          eq(Badge.developerId, developer.id),
          eq(Badge.claimed, true)
        )
      )
      .orderBy(desc(Badge.claimedAt));

    // Get all approved apps for this developer
    const approvedApps = await db.select({
      app: MiniApp,
    })
      .from(MiniApp)
      .where(
        and(
          eq(MiniApp.developerId, developer.id),
          eq(MiniApp.status, "approved")
        )
      );

    // Get all badges (claimed and unclaimed) for this developer - select only columns that exist
    const allBadges = await db.select({
      id: Badge.id,
      name: Badge.name,
      imageUrl: Badge.imageUrl,
      appName: Badge.appName,
      appId: Badge.appId,
      developerId: Badge.developerId,
      txHash: Badge.txHash,
      claimed: Badge.claimed,
      metadataUri: Badge.metadataUri,
      tokenId: Badge.tokenId,
      createdAt: Badge.createdAt,
      claimedAt: Badge.claimedAt,
    })
      .from(Badge)
      .where(eq(Badge.developerId, developer.id));

    // Create a set of app IDs that already have claimed badges
    const appsWithClaimedBadges = new Set(
      allBadges.filter(b => b.claimed && b.appId).map(b => b.appId!)
    );

    // Filter to only apps without claimed badges
    const claimableApps = approvedApps
      .map(({ app }) => app)
      .filter(app => !appsWithClaimedBadges.has(app.id))
      .map(app => ({
        id: app.id,
        name: app.name,
        description: app.description,
        iconUrl: app.iconUrl,
        category: app.category,
        url: app.url,
        createdAt: app.createdAt,
      }));

    // Format earned badges
    const earned = earnedBadges.map(({ badge, app }) => ({
      id: badge.id,
      name: badge.name,
      imageUrl: badge.imageUrl,
      appName: badge.appName,
      appId: badge.appId,
      // badgeType: badge.badgeType, // Commented out - column doesn't exist in DB yet
      txHash: badge.txHash,
      claimed: badge.claimed,
      claimedAt: badge.claimedAt,
      app: app ? {
        id: app.id,
        name: app.name,
        iconUrl: app.iconUrl,
        category: app.category,
        url: app.url,
      } : null,
    }));

    return NextResponse.json({
      earned,
      claimable: claimableApps,
      earnedCount: earned.length,
      claimableCount: claimableApps.length,
    });
  } catch (error) {
    console.error("Error fetching all badges:", error);
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 }
    );
  }
}

