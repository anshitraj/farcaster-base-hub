import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { MiniApp, Developer, Review } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Cache for 30 seconds - app details don't change frequently
export const revalidate = 30;
export const runtime = "nodejs";

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

    let { app, developer } = result;

    // Fix /uploads paths by falling back to original URLs from farcasterJson or placeholder
    if (app.iconUrl?.startsWith("/uploads") || app.headerImageUrl?.startsWith("/uploads") || 
        (app.screenshots && Array.isArray(app.screenshots) && app.screenshots.some((s: string) => s?.startsWith("/uploads")))) {
      if (app.farcasterJson) {
        try {
          const farcasterData = JSON.parse(app.farcasterJson);
          // Fix screenshots array - try to get from farcasterJson or use placeholder
          let fixedScreenshots = app.screenshots || [];
          if (Array.isArray(fixedScreenshots)) {
            fixedScreenshots = fixedScreenshots.map((screenshot: string) => {
              if (screenshot?.startsWith("/uploads/screenshots")) {
                // Try to get original screenshot URLs from farcasterJson
                // Screenshots might be in screenshotUrls or screenshots array
                const originalScreenshots = farcasterData.screenshotUrls || farcasterData.screenshots || [];
                // Try to match by index or just use first available
                // For now, return placeholder - screenshots are less critical than icons
                return "/placeholder.svg";
              }
              return screenshot;
            });
          }
          
          app = {
            ...app,
            iconUrl: app.iconUrl?.startsWith("/uploads") 
              ? (farcasterData.imageUrl || "/placeholder.svg") 
              : app.iconUrl,
            headerImageUrl: app.headerImageUrl?.startsWith("/uploads") 
              ? (farcasterData.splashImageUrl || null) 
              : app.headerImageUrl,
            screenshots: fixedScreenshots,
          };
        } catch (e) {
          // Parsing failed, use placeholder
          let fixedScreenshots = app.screenshots || [];
          if (Array.isArray(fixedScreenshots)) {
            fixedScreenshots = fixedScreenshots.map((screenshot: string) => {
              if (screenshot?.startsWith("/uploads/screenshots")) {
                return "/placeholder.svg";
              }
              return screenshot;
            });
          }
          
          app = {
            ...app,
            iconUrl: app.iconUrl?.startsWith("/uploads") ? "/placeholder.svg" : app.iconUrl,
            headerImageUrl: app.headerImageUrl?.startsWith("/uploads") ? null : app.headerImageUrl,
            screenshots: fixedScreenshots,
          };
        }
      } else {
        // No farcasterJson, use placeholder
        let fixedScreenshots = app.screenshots || [];
        if (Array.isArray(fixedScreenshots)) {
          fixedScreenshots = fixedScreenshots.map((screenshot: string) => {
            if (screenshot?.startsWith("/uploads/screenshots")) {
              return "/placeholder.svg";
            }
            return screenshot;
          });
        }
        
        app = {
          ...app,
          iconUrl: app.iconUrl?.startsWith("/uploads") ? "/placeholder.svg" : app.iconUrl,
          headerImageUrl: app.headerImageUrl?.startsWith("/uploads") ? null : app.headerImageUrl,
          screenshots: fixedScreenshots,
        };
      }
    }

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

    // Fetch fresh user data from Base/Farcaster APIs for each reviewer
    const reviewsWithFreshData = await Promise.all(
      reviewsData.map(async (r) => {
        let reviewerName = r.developer?.name || null;
        let reviewerAvatar = r.developer?.avatar || null;
        
        // If we have a wallet, fetch fresh data from Base/Farcaster APIs
        if (r.developer?.wallet) {
          const normalizedWallet = r.developer.wallet.toLowerCase();
          const isFarcaster = normalizedWallet.startsWith("farcaster:");
          
          try {
            if (isFarcaster) {
              // Fetch from Farcaster/Neynar API
              const fidMatch = normalizedWallet.match(/^farcaster:(\d+)$/);
              if (fidMatch) {
                const fid = fidMatch[1];
                try {
                  const neynarRes = await fetch(
                    `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
                    {
                      headers: {
                        "apikey": process.env.NEYNAR_API_KEY || "",
                        "Content-Type": "application/json",
                      },
                    }
                  );
                  
                  if (neynarRes.ok) {
                    const neynarData = await neynarRes.json();
                    const user = neynarData.users?.[0];
                    if (user) {
                      reviewerName = user.display_name || user.username || reviewerName;
                      reviewerAvatar = user.pfp_url || reviewerAvatar;
                      
                      // Update developer record with fresh data
                      if (r.developer?.id) {
                        await db.update(Developer)
                          .set({
                            avatar: reviewerAvatar,
                            name: reviewerName,
                          })
                          .where(eq(Developer.id, r.developer.id));
                      }
                    }
                  }
                } catch (neynarError) {
                  console.error("Error fetching Farcaster avatar:", neynarError);
                }
              }
            } else {
              // Fetch from Base profile API
              try {
                const baseRes = await fetch(
                  `${request.nextUrl.origin}/api/base/profile?wallet=${encodeURIComponent(normalizedWallet)}`,
                  {
                    headers: {
                      "Content-Type": "application/json",
                    },
                  }
                );
                
                if (baseRes.ok) {
                  const baseData = await baseRes.json();
                  // Use Base API data - it already checks developer record and returns best available data
                  if (baseData.name || baseData.baseEthName) {
                    reviewerName = baseData.name || baseData.baseEthName || reviewerName;
                  }
                  if (baseData.avatar) {
                    reviewerAvatar = baseData.avatar;
                  }
                  
                  // Update developer record with fresh data
                  if (r.developer?.id && (reviewerName || reviewerAvatar)) {
                    await db.update(Developer)
                      .set({
                        avatar: reviewerAvatar,
                        name: reviewerName,
                      })
                      .where(eq(Developer.id, r.developer.id));
                  }
                }
              } catch (baseError) {
                console.error("Error fetching Base avatar:", baseError);
              }
            }
          } catch (avatarError) {
            console.error("Error fetching avatar:", avatarError);
          }
        }
        
        return {
          id: r.review.id,
          rating: r.review.rating,
          comment: r.review.comment,
          createdAt: r.review.createdAt,
          developer: r.developer ? {
            ...r.developer,
            name: reviewerName,
            avatar: reviewerAvatar,
          } : null,
          developerReply: r.review.developerReply,
          developerReplyDate: r.review.developerReplyDate,
          // Include app developer info for reply display
          appDeveloper: developer ? {
            name: developer.name,
            avatar: developer.avatar,
          } : null,
        };
      })
    );

    const reviews = reviewsWithFreshData;

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
        // Badge fields
        developerBadgeReady: (app as any).developerBadgeReady || false,
        developerBadgeImage: (app as any).developerBadgeImage || null,
        developerBadgeMetadata: (app as any).developerBadgeMetadata || null,
        castBadgeMinted: (app as any).castBadgeMinted || false,
        developerBadgeMinted: (app as any).developerBadgeMinted || false,
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

    // Don't cache reviews - they change frequently
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
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

