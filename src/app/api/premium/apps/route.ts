import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Fetch premium apps from different categories
    const [premiumApps, gamesPlaying, getStarted, onSale] = await Promise.all([
      // All premium apps
      prisma.premiumApp.findMany({
        where: {
          miniApp: {
            status: "approved",
          },
        },
        include: {
          miniApp: {
            include: {
              developer: {
                select: {
                  id: true,
                  wallet: true,
                  name: true,
                  avatar: true,
                  verified: true,
                },
              },
            },
          },
        },
        orderBy: {
          addedAt: "desc",
        },
        take: 20,
      }),
      // Games We're Playing (featured in games_playing)
      prisma.premiumApp.findMany({
        where: {
          featuredIn: {
            has: "games_playing",
          },
          miniApp: {
            status: "approved",
          },
        },
        include: {
          miniApp: {
            include: {
              developer: {
                select: {
                  id: true,
                  wallet: true,
                  name: true,
                  avatar: true,
                  verified: true,
                },
              },
            },
          },
        },
        take: 10,
      }),
      // Get Started (featured in get_started)
      prisma.premiumApp.findMany({
        where: {
          featuredIn: {
            has: "get_started",
          },
          miniApp: {
            status: "approved",
          },
        },
        include: {
          miniApp: {
            include: {
              developer: {
                select: {
                  id: true,
                  wallet: true,
                  name: true,
                  avatar: true,
                  verified: true,
                },
              },
            },
          },
        },
        take: 6,
      }),
      // On Sale
      prisma.premiumApp.findMany({
        where: {
          onSale: true,
          miniApp: {
            status: "approved",
          },
        },
        include: {
          miniApp: {
            include: {
              developer: {
                select: {
                  id: true,
                  wallet: true,
                  name: true,
                  avatar: true,
                  verified: true,
                },
              },
            },
          },
        },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      premiumApps: premiumApps.map((pa) => ({
        ...pa.miniApp,
        developer: pa.miniApp.developer,
      })),
      gamesPlaying: gamesPlaying.map((pa) => ({
        ...pa.miniApp,
        developer: pa.miniApp.developer,
      })),
      getStarted: getStarted.map((pa) => ({
        ...pa.miniApp,
        developer: pa.miniApp.developer,
      })),
      onSale: onSale.map((pa) => ({
        ...pa.miniApp,
        developer: pa.miniApp.developer,
        salePrice: pa.salePrice,
      })),
    });
  } catch (error: any) {
    console.error("Get premium apps error:", error);
    return NextResponse.json(
      {
        premiumApps: [],
        gamesPlaying: [],
        getStarted: [],
        onSale: [],
      },
      { status: 200 }
    );
  }
}

