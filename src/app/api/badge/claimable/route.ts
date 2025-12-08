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

    // Get all approved apps
    const appsData = await db.select({
      app: MiniApp,
      developer: {
        id: Developer.id,
        wallet: Developer.wallet,
        name: Developer.name,
      },
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(MiniApp.status, "approved"));
    
    const apps = appsData.map(({ app, developer }) => ({
      ...app,
      developer,
    }));

    // Get developer to find badges
    const developerResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, wallet))
      .limit(1);
    const developer = developerResult[0];
    
    // Get badges separately - select only columns that exist in DB
    const badges = developer ? await db.select({
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
      .where(eq(Badge.developerId, developer.id)) : [];
    
    const developerWithBadges = developer ? {
      ...developer,
      badges,
    } : null;

    // Get list of app names that user already has badges for
    const appsWithBadges = new Set(
      (developerWithBadges?.badges || []).map((badge) => badge.appName)
    );

    // Filter apps where the user's wallet is in the farcaster.json owner field
    const claimableApps: any[] = [];

    for (const app of apps) {
      // Skip if user already has a badge for this app
      if (appsWithBadges.has(app.name)) {
        continue;
      }

      // Check farcaster.json for owner field
      if (app.farcasterJson) {
        try {
          const farcasterData = JSON.parse(app.farcasterJson);
          
          // Check if wallet is in owner field (can be string or array)
          const owners = farcasterData.owner || farcasterData.owners || [];
          const ownerList = Array.isArray(owners) ? owners : [owners];
          
          // Normalize owner addresses for comparison
          const normalizedOwners = ownerList.map((owner: string) => 
            owner.toLowerCase().trim()
          );
          
          if (normalizedOwners.includes(wallet)) {
            claimableApps.push({
              id: app.id,
              name: app.name,
              iconUrl: app.iconUrl,
              url: app.url,
              description: app.description,
              category: app.category,
              createdAt: app.createdAt,
            });
          }
        } catch (e) {
          // Invalid JSON, skip
          console.error(`Error parsing farcaster.json for app ${app.id}:`, e);
        }
      }
    }

    return NextResponse.json({
      claimableApps,
      count: claimableApps.length,
    });
  } catch (error) {
    console.error("Error fetching claimable badges:", error);
    return NextResponse.json(
      { error: "Failed to fetch claimable badges" },
      { status: 500 }
    );
  }
}

