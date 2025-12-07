import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { convertReferralForUser } from "@/lib/referral-helpers";
import { MiniApp, Developer, Review, UserPoints, PointsTransaction } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sql } from "drizzle-orm";

const reviewSchema = z.object({
  miniAppId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

const replySchema = z.object({
  reviewId: z.string().uuid(),
  reply: z.string().min(1, "Reply cannot be empty").max(1000, "Reply must be less than 1000 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    const body = await request.json();
    const validated = reviewSchema.parse(body);

    // Verify app exists and get developer info
    const appResult = await db.select().from(MiniApp).where(eq(MiniApp.id, validated.miniAppId)).limit(1);
    const app = appResult[0];

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Get developer info
    const developerResult = await db.select().from(Developer).where(eq(Developer.id, app.developerId)).limit(1);
    const appDeveloper = developerResult[0];

    // Prevent developers from rating their own apps
    if (session) {
      const developerResult2 = await db.select().from(Developer)
        .where(eq(Developer.wallet, session.wallet.toLowerCase()))
        .limit(1);
      const developer = developerResult2[0];
      
      if (developer && developer.id === app.developerId) {
        return NextResponse.json(
          { error: "You cannot rate your own app" },
          { status: 403 }
        );
      }
    }

    // Get current rating before update
    const previousRating = app.ratingAverage;

    // Get or create developer if session exists and fetch/update avatar
    let developerId: string | undefined;
    let reviewerAvatar: string | null = null;
    
    if (session) {
      const normalizedWallet = session.wallet.toLowerCase();
      let developerResult = await db.select().from(Developer)
        .where(eq(Developer.wallet, normalizedWallet))
        .limit(1);
      let developer = developerResult[0];
      
      // Create developer if doesn't exist
      if (!developer) {
        const [newDeveloper] = await db.insert(Developer).values({
          wallet: normalizedWallet,
        }).returning();
        developer = newDeveloper;
      }
      
      developerId = developer.id;
      
      // Fetch avatar from Base or Farcaster if developer doesn't have one
      if (!developer.avatar) {
        try {
          const isFarcaster = normalizedWallet.startsWith("farcaster:");
          
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
                  if (user?.pfp_url) {
                    reviewerAvatar = user.pfp_url;
                    // Update developer with avatar and name if available
                    await db.update(Developer)
                      .set({
                        avatar: reviewerAvatar,
                        name: user.display_name || user.username || developer.name,
                      })
                      .where(eq(Developer.id, developer.id));
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
                if (baseData.avatar) {
                  reviewerAvatar = baseData.avatar;
                  // Update developer with avatar
                  await db.update(Developer)
                    .set({ avatar: reviewerAvatar })
                    .where(eq(Developer.id, developer.id));
                }
              }
            } catch (baseError) {
              console.error("Error fetching Base avatar:", baseError);
            }
          }
        } catch (avatarError) {
          console.error("Error fetching avatar:", avatarError);
        }
      } else {
        reviewerAvatar = developer.avatar;
      }
    }

    // Check if user already reviewed this app
    let existingReview: any = null;
    let isNewReview = true;
    if (session && developerId) {
      const existingReviewResult = await db.select().from(Review)
        .where(and(
          eq(Review.miniAppId, validated.miniAppId),
          eq(Review.developerId, developerId)
        ))
        .limit(1);
      existingReview = existingReviewResult[0];
    }

    // Update existing review or create new one
    let review;
    if (existingReview) {
      // Update existing review (user can change their rating)
      isNewReview = false;
      const [updatedReview] = await db.update(Review)
        .set({
          rating: validated.rating,
          comment: validated.comment || null,
        })
        .where(eq(Review.id, existingReview.id))
        .returning();
      review = updatedReview;
    } else {
      // Create new review
      const [newReview] = await db.insert(Review).values({
        miniAppId: validated.miniAppId,
        rating: validated.rating,
        comment: validated.comment,
        developerId,
      }).returning();
      review = newReview;
    }

    // Recalculate rating
    const reviews = await db.select({ rating: Review.rating })
      .from(Review)
      .where(eq(Review.miniAppId, validated.miniAppId));

    const ratingCount = reviews.length;
    const ratingAverage =
      reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount;

    await db.update(MiniApp)
      .set({
        ratingCount,
        ratingAverage,
      })
      .where(eq(MiniApp.id, validated.miniAppId));

    // Award 10 points for rating (Rate 2 Earn)
    let pointsAwarded = 0;
    if (session && isNewReview) {
      // Only award points if this is a new review (not an update)
      const RATING_POINTS = 10; // Changed from 100 to 10
      
      try {
        // Find or create user points record
        const walletLower = session.wallet.toLowerCase();
        let userPointsResult = await db.select().from(UserPoints)
          .where(eq(UserPoints.wallet, walletLower))
          .limit(1);
        let userPoints = userPointsResult[0];

        if (!userPoints) {
          const [newPoints] = await db.insert(UserPoints).values({
            wallet: walletLower,
            totalPoints: RATING_POINTS,
          }).returning();
          userPoints = newPoints;
        } else {
          // Update points
          const [updatedPoints] = await db.update(UserPoints)
            .set({
              totalPoints: userPoints.totalPoints + RATING_POINTS,
            })
            .where(eq(UserPoints.wallet, walletLower))
            .returning();
          userPoints = updatedPoints;
        }

        // Create transaction record
        await db.insert(PointsTransaction).values({
          wallet: walletLower,
          points: RATING_POINTS,
          type: "review",
          description: `Earned ${RATING_POINTS} points for rating "${app.name}"`,
          referenceId: review.id,
        });

        pointsAwarded = RATING_POINTS;

        // Award 50 points to developer for receiving a review
        try {
          if (appDeveloper && appDeveloper.wallet) {
            const devWalletLower = appDeveloper.wallet.toLowerCase();
            // Find or create developer's user points record
            let developerPointsResult = await db.select().from(UserPoints)
              .where(eq(UserPoints.wallet, devWalletLower))
              .limit(1);
            let developerPoints = developerPointsResult[0];

            const DEVELOPER_REVIEW_POINTS = 50;

            if (!developerPoints) {
              const [newDevPoints] = await db.insert(UserPoints).values({
                wallet: devWalletLower,
                totalPoints: DEVELOPER_REVIEW_POINTS,
              }).returning();
              developerPoints = newDevPoints;
            } else {
              const [updatedDevPoints] = await db.update(UserPoints)
                .set({
                  totalPoints: developerPoints.totalPoints + DEVELOPER_REVIEW_POINTS,
                })
                .where(eq(UserPoints.wallet, devWalletLower))
                .returning();
              developerPoints = updatedDevPoints;
            }

            // Create transaction record for developer
            await db.insert(PointsTransaction).values({
              wallet: devWalletLower,
              points: DEVELOPER_REVIEW_POINTS,
              type: "review_received",
              description: `Earned ${DEVELOPER_REVIEW_POINTS} points for receiving a review on "${app.name}"`,
              referenceId: review.id,
            });
          }
        } catch (developerPointsError) {
          // Don't fail the review if developer points system has an error
          console.error("Error awarding developer points:", developerPointsError);
        }

        // Convert referral if user came from a referral link
        await convertReferralForUser(session.wallet);
      } catch (pointsError) {
        // Don't fail the review if points system has an error
        console.error("Error awarding points:", pointsError);
      }
    }

    // Award 100 XP to developer if app rating is above 3 stars
    let developerXPAwarded = 0;
    if (ratingAverage > 3.0 && appDeveloper && appDeveloper.wallet) {
      const DEVELOPER_XP = 100;
      
      try {
        // Award XP if rating just crossed 3.0 threshold (was <= 3.0, now > 3.0)
        const shouldAwardXP = previousRating <= 3.0 && ratingAverage > 3.0;
        
        if (shouldAwardXP) {
          const devWalletLower = appDeveloper.wallet.toLowerCase();
          // Check if developer already received XP for this app (prevent duplicate)
          const existingXPResult = await db.select().from(PointsTransaction)
            .where(and(
              eq(PointsTransaction.wallet, devWalletLower),
              eq(PointsTransaction.type, "developer_rating"),
              eq(PointsTransaction.referenceId, validated.miniAppId)
            ))
            .limit(1);
          const existingXP = existingXPResult[0];

          if (!existingXP) {
            // Find or create developer points record
            let devPointsResult = await db.select().from(UserPoints)
              .where(eq(UserPoints.wallet, devWalletLower))
              .limit(1);
            let devPoints = devPointsResult[0];

            if (!devPoints) {
              const [newDevPoints] = await db.insert(UserPoints).values({
                wallet: devWalletLower,
                totalPoints: DEVELOPER_XP,
              }).returning();
              devPoints = newDevPoints;
            } else {
              const [updatedDevPoints] = await db.update(UserPoints)
                .set({
                  totalPoints: devPoints.totalPoints + DEVELOPER_XP,
                })
                .where(eq(UserPoints.wallet, devWalletLower))
                .returning();
              devPoints = updatedDevPoints;
            }

            // Create transaction record
            await db.insert(PointsTransaction).values({
              wallet: devWalletLower,
              points: DEVELOPER_XP,
              type: "developer_rating",
              description: `Earned ${DEVELOPER_XP} XP - Your app "${app.name}" reached ${ratingAverage.toFixed(1)} stars!`,
              referenceId: validated.miniAppId,
            });

            developerXPAwarded = DEVELOPER_XP;
          }
        }
      } catch (xpError) {
        // Don't fail the review if XP system has an error
        console.error("Error awarding developer XP:", xpError);
      }
    }

    return NextResponse.json({
      success: true,
      ratingAverage,
      ratingCount,
      pointsAwarded,
      developerXPAwarded,
      message: pointsAwarded > 0 
        ? `You earned ${pointsAwarded} points for this review! 🎉`
        : undefined,
      developerMessage: developerXPAwarded > 0
        ? `Developer earned ${developerXPAwarded} XP - App rating above 3 stars! ⭐`
        : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Create review error:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = replySchema.parse(body);

    // Get the review
    const reviewResult = await db.select({
      review: Review,
      app: MiniApp,
      appDeveloper: Developer,
    })
      .from(Review)
      .leftJoin(MiniApp, eq(Review.miniAppId, MiniApp.id))
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(Review.id, validated.reviewId))
      .limit(1);

    const result = reviewResult[0];
    if (!result || !result.review || !result.app) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    const { review, app, appDeveloper } = result;

    // Verify that the authenticated developer owns the app
    const developerResult = await db.select()
      .from(Developer)
      .where(eq(Developer.wallet, session.wallet.toLowerCase()))
      .limit(1);

    const developer = developerResult[0];
    if (!developer || !appDeveloper || developer.id !== appDeveloper.id) {
      return NextResponse.json(
        { error: "You can only reply to reviews for your own apps" },
        { status: 403 }
      );
    }

    // Update the review with the developer reply
    const [updatedReview] = await db.update(Review)
      .set({
        developerReply: validated.reply,
        developerReplyDate: sql`now()`,
      })
      .where(eq(Review.id, validated.reviewId))
      .returning();

    return NextResponse.json({
      success: true,
      review: {
        id: updatedReview.id,
        developerReply: updatedReview.developerReply,
        developerReplyDate: updatedReview.developerReplyDate,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Reply to review error:", error);
    return NextResponse.json(
      { error: "Failed to reply to review" },
      { status: 500 }
    );
  }
}

