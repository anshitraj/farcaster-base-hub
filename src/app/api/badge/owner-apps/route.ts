import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { MiniApp, Developer } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

/**
 * Get apps where the user is an owner (from farcaster.json) but not the lister
 * These apps are eligible for SBT badges
 */
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

    // Only work with Ethereum addresses (0x...), not Farcaster IDs (farcaster:...)
    // Owner badges require Ethereum addresses from farcaster.json
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json(
        { apps: [] }, // Return empty array for non-Ethereum wallets
        { status: 200 }
      );
    }

    // Fetch all approved apps
    const allApps = await db.select({
      id: MiniApp.id,
      name: MiniApp.name,
      iconUrl: MiniApp.iconUrl,
      category: MiniApp.category,
      farcasterJson: MiniApp.farcasterJson,
      developerId: MiniApp.developerId,
      status: MiniApp.status,
      createdAt: MiniApp.createdAt,
    })
      .from(MiniApp)
      .where(eq(MiniApp.status, "approved"));

    // Filter apps where user is owner but not lister
    const ownerApps = allApps.filter((app) => {
      if (!app.farcasterJson) return false;

      try {
        const farcasterData = JSON.parse(app.farcasterJson);
        const owners = farcasterData.owner || farcasterData.owners || [];
        const ownerList = Array.isArray(owners) ? owners : [owners];
        const normalizedOwners = ownerList.map((owner: string) => 
          owner.toLowerCase().trim()
        );

        // Check if wallet is in owners list
        const isOwner = normalizedOwners.includes(wallet);
        
        // We'll check if they're the lister separately by comparing developerId
        // For now, return all apps where user is owner
        return isOwner;
      } catch (e) {
        return false;
      }
    });

    // Get developer to check if user is the lister
    const developer = await db.select()
      .from(Developer)
      .where(eq(Developer.wallet, wallet))
      .limit(1);

    const developerId = developer[0]?.id;

    // Filter out apps where user is the lister (those are handled separately)
    const ownerOnlyApps = ownerApps.filter((app) => {
      return app.developerId !== developerId;
    });

    return NextResponse.json({
      apps: ownerOnlyApps.map((app) => ({
        id: app.id,
        name: app.name,
        iconUrl: app.iconUrl,
        category: app.category,
        createdAt: app.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Get owner apps error:", error);
    return NextResponse.json(
      { error: "Failed to fetch owner apps", message: error.message },
      { status: 500 }
    );
  }
}

