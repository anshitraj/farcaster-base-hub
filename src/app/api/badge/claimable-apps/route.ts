import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { MiniApp, Developer, Badge } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

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
      return NextResponse.json(
        { claimableApps: [], count: 0 },
        { status: 200 }
      );
    }

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

    // Get all badges for this developer
    const badges = await db.select()
      .from(Badge)
      .where(eq(Badge.developerId, developer.id));

    // Create sets of app IDs that already have each badge type
    const appsWithSBTBadges = new Set(
      badges.filter(b => b.claimed && b.appId && b.badgeType === "sbt").map(b => b.appId!)
    );
    const appsWithCastBadges = new Set(
      badges.filter(b => b.claimed && b.appId && b.badgeType === "cast_your_app").map(b => b.appId!)
    );

    // Build claimable apps with badge types
    const claimableApps: any[] = [];

    // Add Cast Your App badges (for apps the developer listed)
    for (const { app } of listedApps) {
      if (!appsWithCastBadges.has(app.id)) {
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
    return NextResponse.json(
      { error: "Failed to fetch claimable apps" },
      { status: 500 }
    );
  }
}

