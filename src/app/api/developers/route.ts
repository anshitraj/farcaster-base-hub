import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Developer, MiniApp, Badge } from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const dynamic = 'force-dynamic';

// Cache for 30 seconds
export const revalidate = 30;
export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const sortBy = searchParams.get("sort") || "apps"; // "apps" | "xp" | "newest"

    // OPTIMIZED: Use single query with JOINs and aggregations instead of N+1 queries
    const developersWithStats = await db.select({
      id: Developer.id,
      wallet: Developer.wallet,
      name: Developer.name,
      avatar: Developer.avatar,
      bio: Developer.bio,
      verified: Developer.verified,
      totalXP: Developer.totalXP,
      developerLevel: Developer.developerLevel,
      createdAt: Developer.createdAt,
      appCount: sql<number>`COUNT(DISTINCT ${MiniApp.id})`.as('appCount'),
      badgeCount: sql<number>`COUNT(DISTINCT ${Badge.id})`.as('badgeCount'),
      totalClicks: sql<number>`COALESCE(SUM(${MiniApp.clicks}), 0)`.as('totalClicks'),
      totalInstalls: sql<number>`COALESCE(SUM(${MiniApp.installs}), 0)`.as('totalInstalls'),
    })
      .from(Developer)
      .leftJoin(MiniApp, and(
        eq(MiniApp.developerId, Developer.id),
        eq(MiniApp.status, "approved")
      ))
      .leftJoin(Badge, eq(Badge.developerId, Developer.id))
      .groupBy(Developer.id)
      .having(sql`COUNT(DISTINCT ${MiniApp.id}) > 0`); // Only developers with apps

    // Sort developers (convert SQL results to numbers)
    let sorted = developersWithStats.map(dev => ({
      ...dev,
      appCount: Number(dev.appCount) || 0,
      badgeCount: Number(dev.badgeCount) || 0,
      totalClicks: Number(dev.totalClicks) || 0,
      totalInstalls: Number(dev.totalInstalls) || 0,
      totalXP: dev.totalXP || 0,
      developerLevel: dev.developerLevel || 1,
    }));

    if (sortBy === "apps") {
      sorted.sort((a, b) => b.appCount - a.appCount);
    } else if (sortBy === "xp") {
      sorted.sort((a, b) => b.totalXP - a.totalXP);
    } else if (sortBy === "newest") {
      sorted.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      });
    }

    // Limit results
    const limited = sorted.slice(0, limit);

    const response = NextResponse.json({
      developers: limited,
      total: sorted.length,
    });

    // Add cache headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error: any) {
    console.error("Get developers error:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    
    // Check if it's a database connection error
    if (error?.message?.includes("connection") || error?.message?.includes("database") || !process.env.DATABASE_URL) {
      return NextResponse.json(
        { 
          developers: [], 
          total: 0, 
          error: "Database connection failed",
          message: process.env.DATABASE_URL 
            ? "Database connection failed. Check if database is available."
            : "DATABASE_URL environment variable is not set."
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { developers: [], total: 0, error: "Failed to fetch developers", message: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

