import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    // Fetch all users with points, sorted by totalPoints descending
    const users = await prisma.userPoints.findMany({
      orderBy: {
        totalPoints: "desc",
      },
      take: limit,
    });

    // Fetch developer info for each user to get name, avatar, etc.
    const usersWithInfo = await Promise.all(
      users.map(async (user) => {
        const developer = await prisma.developer.findUnique({
          where: { wallet: user.wallet },
          select: {
            name: true,
            avatar: true,
            verified: true,
            totalXP: true,
            developerLevel: true,
          },
        });

        return {
          wallet: user.wallet,
          totalPoints: user.totalPoints || 0,
          name: developer?.name || null,
          avatar: developer?.avatar || null,
          verified: developer?.verified || false,
          totalXP: developer?.totalXP || 0,
          developerLevel: developer?.developerLevel || 1,
        };
      })
    );

    return NextResponse.json({
      users: usersWithInfo,
      total: usersWithInfo.length,
    });
  } catch (error: any) {
    console.error("Get ranking error:", error);
    return NextResponse.json(
      { users: [], total: 0, error: "Failed to fetch ranking" },
      { status: 500 }
    );
  }
}

