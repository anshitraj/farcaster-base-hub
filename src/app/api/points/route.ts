import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { UserPoints, PointsTransaction } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // Mark as dynamic since it uses cookies
export const revalidate = 30; // Cache for 30 seconds

export async function GET(request: NextRequest) {
  try {
    // OPTIMIZE: Check cookie FIRST (no DB query for session)
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    let wallet: string | null = cookieStore.get("walletAddress")?.value || null;
    
    // Only query DB for session if cookie doesn't exist
    if (!wallet) {
      const session = await getSessionFromCookies();
      wallet = session?.wallet || null;
    }
    
    if (!wallet) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const walletLower = wallet.toLowerCase();
    
    // OPTIMIZE: Fetch points and transactions in parallel (2 queries -> 1 parallel call)
    try {
      const [pointsResult, transactionsResult] = await Promise.all([
        db
          .select({ totalPoints: UserPoints.totalPoints })
          .from(UserPoints)
          .where(eq(UserPoints.wallet, walletLower))
          .limit(1),
        db
          .select({
            id: PointsTransaction.id,
            points: PointsTransaction.points,
            type: PointsTransaction.type,
            description: PointsTransaction.description,
            createdAt: PointsTransaction.createdAt,
          })
          .from(PointsTransaction)
          .where(eq(PointsTransaction.wallet, walletLower))
          .orderBy(desc(PointsTransaction.createdAt))
          .limit(10),
      ]);

      let userPoints = pointsResult[0];
      const transactions = transactionsResult || [];

      // If no points record exists, create one with 0 points (non-blocking)
      if (!userPoints) {
        try {
          const [newPoints] = await db.insert(UserPoints).values({
            wallet: walletLower,
            totalPoints: 0,
          }).returning();
          userPoints = newPoints;
        } catch (insertError: any) {
          // Handle race condition - another request might have created it
          if (insertError?.code !== '23505') { // Not a unique constraint violation
            throw insertError;
          }
          // Try to fetch again
          const retryResult = await db
            .select({ totalPoints: UserPoints.totalPoints })
            .from(UserPoints)
            .where(eq(UserPoints.wallet, walletLower))
            .limit(1);
          userPoints = retryResult[0] || { totalPoints: 0 };
        }
      }

      const response = NextResponse.json({
        totalPoints: userPoints?.totalPoints || 0,
        transactions,
      });
      
      response.headers.set('Cache-Control', 'private, max-age=30');
      return response;
    } catch (dbError: any) {
      // If database is unavailable, return 0 points
      if (dbError?.message?.includes('connection') || dbError?.message?.includes('database')) {
        const response = NextResponse.json({
          totalPoints: 0,
          transactions: [],
        });
        response.headers.set('Cache-Control', 'private, max-age=5'); // Short cache on error
        return response;
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Get points error:", error);
    return NextResponse.json(
      { error: "Failed to get points" },
      { status: 500 }
    );
  }
}

