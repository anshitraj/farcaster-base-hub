import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    console.error("Get Top 30 error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Top 30 apps", apps: [] },
      { status: 500 }
    );
  }
}

