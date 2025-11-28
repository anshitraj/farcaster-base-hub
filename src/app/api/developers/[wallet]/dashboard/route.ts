import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const wallet = params.wallet.toLowerCase();

    const developer = await prisma.developer.findUnique({
      where: { wallet },
      include: {
        apps: {
          include: {
            _count: {
              select: {
                reviews: true,
              },
            },
          },
        },
        badges: true,
      },
    });

    if (!developer) {
      return NextResponse.json(
        { error: "Developer not found" },
        { status: 404 }
      );
    }

    // Calculate stats
    const totalApps = developer.apps.length;
    const totalClicks = developer.apps.reduce((sum, app) => sum + app.clicks, 0);
    const totalInstalls = developer.apps.reduce((sum, app) => sum + app.installs, 0);
    
    const appsWithRatings = developer.apps.filter((app) => app.ratingCount > 0);
    const averageRating =
      appsWithRatings.length > 0
        ? appsWithRatings.reduce((sum, app) => sum + app.ratingAverage, 0) /
          appsWithRatings.length
        : 0;

    const badgesCount = developer.badges.length;

    // Format apps for dashboard
    const apps = developer.apps.map((app) => ({
      id: app.id,
      name: app.name,
      clicks: app.clicks,
      installs: app.installs,
      ratingAverage: app.ratingAverage,
      ratingCount: app.ratingCount,
      status: app.status, // Include status so users can see if app is approved
      url: app.url,
      monetizationEnabled: app.monetizationEnabled || false,
    }));

    return NextResponse.json({
      totalApps,
      totalClicks,
      totalInstalls,
      averageRating,
      badgesCount,
      apps,
      // XP & Streak data
      streakCount: developer.streakCount || 0,
      lastClaimDate: developer.lastClaimDate,
      totalXP: developer.totalXP || 0,
      developerLevel: developer.developerLevel || 1,
    });
  } catch (error) {
    console.error("Get dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}

