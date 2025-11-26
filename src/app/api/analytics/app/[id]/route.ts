import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const appId = params.id;

    // Get app and verify ownership
    const app = await prisma.miniApp.findUnique({
      where: { id: appId },
      include: { developer: true },
    });

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Check if user owns the app or is admin
    const isOwner = app.developer.wallet.toLowerCase() === wallet.toLowerCase();
    const isAdmin = app.developer.isAdmin;

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get date range (default: last 30 days)
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get("days") || "30", 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Daily launch count
    const dailyLaunches = await prisma.appLaunchEvent.groupBy({
      by: ["createdAt"],
      where: {
        miniAppId: appId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Daily unique users
    const dailyUniqueUsers = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT wallet) as unique_users
      FROM "AppLaunchEvent"
      WHERE "miniAppId" = ${appId}
        AND created_at >= ${startDate}
        AND wallet IS NOT NULL
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    // Average session time
    const sessionEvents = await prisma.analyticsEvent.findMany({
      where: {
        miniAppId: appId,
        eventType: { in: ["session_start", "session_end"] },
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: "asc" },
    });

    // Calculate session times
    const sessionTimes: number[] = [];
    const sessionMap = new Map<string, { start: Date; end?: Date }>();

    for (const event of sessionEvents) {
      if (!event.sessionId) continue;

      if (event.eventType === "session_start") {
        sessionMap.set(event.sessionId, { start: event.createdAt });
      } else if (event.eventType === "session_end") {
        const session = sessionMap.get(event.sessionId);
        if (session) {
          const duration = (event.createdAt.getTime() - session.start.getTime()) / 1000;
          sessionTimes.push(duration);
        }
      }
    }

    const avgSessionTime = sessionTimes.length > 0
      ? sessionTimes.reduce((a, b) => a + b, 0) / sessionTimes.length
      : 0;

    // Click → Launch → Retention Funnel
    const clicks = await prisma.appEvent.count({
      where: {
        miniAppId: appId,
        type: "click",
        createdAt: { gte: startDate },
      },
    });

    const launches = await prisma.appLaunchEvent.count({
      where: {
        miniAppId: appId,
        createdAt: { gte: startDate },
      },
    });

    const installs = await prisma.appEvent.count({
      where: {
        miniAppId: appId,
        type: "install",
        createdAt: { gte: startDate },
      },
    });

    // Trending score (from existing algorithm)
    const trendingScore = app.popularityScore || 0;

    // Demographics (Farcaster follower count - placeholder, would need Farcaster API)
    const farcasterUsers = await prisma.appLaunchEvent.count({
      where: {
        miniAppId: appId,
        farcasterId: { not: null },
        createdAt: { gte: startDate },
      },
    });

    // XP influence tracking
    const xpFromApp = await prisma.xPLog.aggregate({
      where: {
        referenceId: appId,
        reason: "app_launch",
        createdAt: { gte: startDate },
      },
      _sum: { amount: true },
    });

    return NextResponse.json({
      appId,
      period: { days, startDate, endDate: new Date() },
      metrics: {
        dailyLaunches: dailyLaunches.map((d) => ({
          date: d.createdAt.toISOString().split("T")[0],
          count: d._count,
        })),
        dailyUniqueUsers: (dailyUniqueUsers as any[]).map((d: any) => ({
          date: d.date,
          users: Number(d.unique_users),
        })),
        averageSessionTime: Math.round(avgSessionTime), // in seconds
        trendingScore,
        funnel: {
          clicks,
          launches,
          installs,
          clickToLaunchRate: clicks > 0 ? (launches / clicks) * 100 : 0,
          launchToInstallRate: launches > 0 ? (installs / launches) * 100 : 0,
        },
        demographics: {
          farcasterUsers,
          totalUsers: app.uniqueUsers || 0,
        },
        xpInfluence: {
          totalXP: xpFromApp._sum.amount || 0,
          usersEarnedXP: await prisma.xPLog.count({
            where: {
              referenceId: appId,
              reason: "app_launch",
              createdAt: { gte: startDate },
            },
            distinct: ["developerId"],
          }),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

