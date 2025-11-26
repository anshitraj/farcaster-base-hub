import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const sortBy = searchParams.get("sort") || "apps"; // "apps" | "xp" | "newest"

    // Fetch all developers with their apps and badges
    const developers = await prisma.developer.findMany({
      include: {
        apps: {
          where: {
            status: "approved", // Only count approved apps
          },
          select: {
            id: true,
            clicks: true,
            installs: true,
          },
        },
        badges: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            apps: {
              where: {
                status: "approved",
              },
            },
            badges: true,
          },
        },
      },
    });

    // Calculate stats and sort
    const developersWithStats = developers.map((dev) => {
      const totalClicks = dev.apps.reduce((sum, app) => sum + app.clicks, 0);
      const totalInstalls = dev.apps.reduce((sum, app) => sum + app.installs, 0);

      return {
        id: dev.id,
        wallet: dev.wallet,
        name: dev.name,
        avatar: dev.avatar,
        bio: dev.bio,
        verified: dev.verified,
        totalXP: dev.totalXP || 0,
        developerLevel: dev.developerLevel || 1,
        appCount: dev._count.apps,
        badgeCount: dev._count.badges,
        totalClicks,
        totalInstalls,
        createdAt: dev.createdAt,
      };
    });

    // Sort developers
    let sorted = [...developersWithStats];
    if (sortBy === "apps") {
      sorted.sort((a, b) => b.appCount - a.appCount);
    } else if (sortBy === "xp") {
      sorted.sort((a, b) => b.totalXP - a.totalXP);
    } else if (sortBy === "newest") {
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Filter out developers with no apps (optional - you can remove this if you want to show all)
    sorted = sorted.filter((dev) => dev.appCount > 0);

    // Limit results
    const limited = sorted.slice(0, limit);

    return NextResponse.json({
      developers: limited,
      total: sorted.length,
    });
  } catch (error: any) {
    console.error("Get developers error:", error);
    return NextResponse.json(
      { developers: [], total: 0, error: "Failed to fetch developers" },
      { status: 500 }
    );
  }
}

