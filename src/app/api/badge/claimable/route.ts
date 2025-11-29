import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export const dynamic = 'force-dynamic';

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
    const apps = await prisma.miniApp.findMany({
      where: {
        status: "approved",
      },
      include: {
        developer: {
          select: {
            id: true,
            wallet: true,
            name: true,
          },
        },
      },
    });

    // Get developer to find badges
    const developer = await prisma.developer.findUnique({
      where: { wallet: wallet },
      include: {
        badges: true,
      },
    });

    // Get list of app names that user already has badges for
    const appsWithBadges = new Set(
      (developer?.badges || []).map((badge) => badge.appName)
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

