import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { MiniApp, Developer, Review } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Cache for 30 seconds - app details don't change frequently
export const revalidate = 30;
export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // OPTIMIZED: Single query with JOIN to fetch app + developer
    const appData = await db.select({
      app: MiniApp,
      developer: {
        id: Developer.id,
        wallet: Developer.wallet,
        name: Developer.name,
        avatar: Developer.avatar,
        bio: Developer.bio,
        verified: Developer.verified,
      },
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(MiniApp.id, params.id))
      .limit(1);

    const result = appData[0];
    if (!result) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    const { app, developer } = result;

    // Fetch reviews with their developers (single query)
    // Also fetch app developer info for replies
    const reviewsData = await db.select({
      review: Review,
      developer: {
        id: Developer.id,
        wallet: Developer.wallet,
        name: Developer.name,
        avatar: Developer.avatar,
      },
    })
      .from(Review)
      .leftJoin(Developer, eq(Review.developerId, Developer.id))
      .where(eq(Review.miniAppId, app.id))
      .orderBy(desc(Review.createdAt));

    const reviews = reviewsData.map((r) => ({
      id: r.review.id,
      rating: r.review.rating,
      comment: r.review.comment,
      createdAt: r.review.createdAt,
      developer: r.developer,
      developerReply: r.review.developerReply,
      developerReplyDate: r.review.developerReplyDate,
      // Include app developer info for reply display
      appDeveloper: developer ? {
        name: developer.name,
        avatar: developer.avatar,
      } : null,
    }));

    // Calculate actual review count from reviews array (more accurate than stored value)
    const actualReviewCount = reviews.length;
    const actualRatingAverage = actualReviewCount > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / actualReviewCount
      : (app.ratingAverage || 0);

    const response = NextResponse.json({
      app: {
        id: app.id,
        name: app.name,
        description: app.description,
        url: app.url,
        baseMiniAppUrl: app.baseMiniAppUrl,
        farcasterUrl: app.farcasterUrl,
        iconUrl: app.iconUrl,
        headerImageUrl: app.headerImageUrl,
        category: app.category,
        verified: app.verified,
        contractAddress: app.contractAddress,
        contractVerified: app.contractVerified,
        developerTags: app.developerTags || [],
        tags: app.tags || [],
        screenshots: app.screenshots || [],
        whatsNew: (app as any).whatsNew || null,
        lastUpdatedAt: app.lastUpdatedAt,
        launchCount: app.launchCount || 0,
        uniqueUsers: app.uniqueUsers || 0,
        popularityScore: app.popularityScore || 0,
        clicks: app.clicks || 0,
        installs: app.installs || 0,
        ratingAverage: actualRatingAverage,
        ratingCount: actualReviewCount,
        createdAt: app.createdAt,
        supportEmail: (app as any).supportEmail || null,
        twitterUrl: (app as any).twitterUrl || null,
        developer: developer ? {
          ...developer,
          verified: developer.verified,
        } : null,
      },
      reviews: reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt instanceof Date ? review.createdAt.toISOString() : review.createdAt,
        developerReply: review.developerReply,
        developerReplyDate: review.developerReplyDate 
          ? (review.developerReplyDate instanceof Date 
              ? review.developerReplyDate.toISOString() 
              : review.developerReplyDate)
          : null,
        appDeveloper: review.appDeveloper,
        developer: review.developer, // Include for backward compatibility
        developerReviewer: review.developer ? {
          ...review.developer,
        } : null,
      })),
    });

    // Add cache headers for better performance
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error("Get app error:", error);
    return NextResponse.json(
      { error: "Failed to fetch app" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get app and verify ownership
    const appResult = await db.select().from(MiniApp).where(eq(MiniApp.id, params.id)).limit(1);
    const app = appResult[0];

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Fetch developer to verify ownership
    const developerResult = await db.select().from(Developer).where(eq(Developer.id, app.developerId)).limit(1);
    const developer = developerResult[0];

    if (!developer) {
      return NextResponse.json(
        { error: "Developer not found" },
        { status: 404 }
      );
    }

    // Verify the user owns this app
    if (developer.wallet.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json(
        { error: "You can only delete your own apps" },
        { status: 403 }
      );
    }

    // Delete app (cascade will delete reviews, events, etc.)
    await db.delete(MiniApp).where(eq(MiniApp.id, params.id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.message?.includes('connection') || error?.message?.includes('database')) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    
    console.error("Delete app error:", error);
    return NextResponse.json(
      { error: "Failed to delete app" },
      { status: 500 }
    );
  }
}

