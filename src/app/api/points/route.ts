import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    // Fallback: check walletAddress cookie if DB session doesn't exist
    let wallet: string | null = null;
    if (session) {
      wallet = session.wallet;
    } else {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const walletFromCookie = cookieStore.get("walletAddress")?.value;
      if (walletFromCookie) {
        wallet = walletFromCookie;
      }
    }
    
    if (!wallet) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user points
    let userPoints;
    let transactions: any[] = [];
    
    try {
      userPoints = await prisma.userPoints.findUnique({
        where: { wallet: wallet.toLowerCase() },
      });

      // If no points record exists, create one with 0 points
      if (!userPoints) {
        userPoints = await prisma.userPoints.create({
          data: {
            wallet: wallet.toLowerCase(),
            totalPoints: 0,
          },
        });
      }

      // Get recent transactions
      transactions = await prisma.pointsTransaction.findMany({
        where: { wallet: wallet.toLowerCase() },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
    } catch (dbError: any) {
      // If database is unavailable, return 0 points
      if (dbError?.code === 'P1001' || dbError?.message?.includes('Can\'t reach database')) {
        return NextResponse.json({
          totalPoints: 0,
          transactions: [],
        });
      }
      throw dbError;
    }

    return NextResponse.json({
      totalPoints: userPoints.totalPoints,
      transactions,
    });
  } catch (error) {
    console.error("Get points error:", error);
    return NextResponse.json(
      { error: "Failed to get points" },
      { status: 500 }
    );
  }
}

