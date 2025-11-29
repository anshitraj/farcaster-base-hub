import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Fetch Top 30 from database
    const top30 = await prisma.topBaseApps.findMany({
      orderBy: {
        rank: "asc",
      },
      take: 30,
    });

    // Try to match with existing MiniApps
    const appsWithMatches = await Promise.all(
      top30.map(async (topApp) => {
        const matchingApp = await prisma.miniApp.findUnique({
          where: { url: topApp.url },
          include: {
            developer: {
              select: {
                id: true,
                wallet: true,
                name: true,
                verified: true,
              },
            },
          },
        });

        return {
          ...topApp,
          app: matchingApp || null,
        };
      })
    );

    return NextResponse.json({
      apps: appsWithMatches,
      total: top30.length,
    });
  } catch (error: any) {
    // Gracefully handle database connection errors during build
    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database")) {
      console.error("Get Top 30 error:", error.message);
      return NextResponse.json({ apps: [], total: 0 }, { status: 200 });
    }
    console.error("Get Top 30 error:", error);
    return NextResponse.json({ apps: [], total: 0 }, { status: 200 });
  }
}

