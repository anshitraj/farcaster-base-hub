import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    let wallet: string | null = null;
    if (session?.wallet) {
      wallet = session.wallet;
    } else {
      const cookieStore = await cookies();
      wallet = cookieStore.get("walletAddress")?.value || null;
    }

    if (!wallet) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find developer
    const developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
      include: {
        apps: {
          orderBy: { createdAt: "desc" },
          include: {
            reviews: {
              select: {
                rating: true,
              },
            },
            collectionItems: {
              where: {
                collection: {
                  type: "favorites",
                },
              },
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!developer) {
      return NextResponse.json({ apps: [] });
    }

    // Format apps with stats
    const apps = developer.apps.map((app) => ({
      id: app.id,
      name: app.name,
      description: app.description,
      url: app.url,
      baseMiniAppUrl: app.baseMiniAppUrl,
      farcasterUrl: app.farcasterUrl,
      iconUrl: app.iconUrl,
      headerImageUrl: app.headerImageUrl,
      category: app.category,
      status: app.status,
      verified: app.verified,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      clicks: app.clicks,
      installs: app.installs,
      launchCount: app.launchCount,
      ratingAverage: app.ratingAverage,
      ratingCount: app.ratingCount,
      favoriteCount: app.collectionItems.length,
      tags: app.tags,
    }));

    return NextResponse.json({ apps });
  } catch (error: any) {
    console.error("Error fetching developer apps:", error);
    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database")) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch apps" },
      { status: 500 }
    );
  }
}

