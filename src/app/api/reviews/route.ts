import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { convertReferralForUser } from "@/lib/referral-helpers";
import { z } from "zod";

const reviewSchema = z.object({
  miniAppId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    const body = await request.json();
    const validated = reviewSchema.parse(body);

    // Verify app exists and get developer info
    const app = await prisma.miniApp.findUnique({
      where: { id: validated.miniAppId },
      include: { developer: true },
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Prevent developers from rating their own apps
    if (session) {
      const developer = await prisma.developer.findUnique({
        where: { wallet: session.wallet },
      });
      
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
      let developer = await prisma.developer.findUnique({
        where: { wallet: normalizedWallet },
      });
      
      // Create developer if doesn't exist
      if (!developer) {
        developer = await prisma.developer.create({
          data: {
            wallet: normalizedWallet,
          },
        });
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
                    await prisma.developer.update({
                      where: { id: developer.id },
                      data: {
                        avatar: reviewerAvatar,
                        name: user.display_name || user.username || developer.name,
                      },
                    });
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
                  await prisma.developer.update({
                    where: { id: developer.id },
                    data: { avatar: reviewerAvatar },
                  });
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
      existingReview = await prisma.review.findFirst({
        where: {
          miniAppId: validated.miniAppId,
          developerId: developerId,
        },
      });
    }

    // Update existing review or create new one
    let review;
    if (existingReview) {
      // Update existing review (user can change their rating)
      isNewReview = false;
      review = await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating: validated.rating,
          comment: validated.comment || null,
        },
      });
    } else {
      // Create new review
      review = await prisma.review.create({
        data: {
          miniAppId: validated.miniAppId,
          rating: validated.rating,
          comment: validated.comment,
          developerId,
        },
      });
    }

    // Recalculate rating
    const reviews = await prisma.review.findMany({
      where: { miniAppId: validated.miniAppId },
      select: { rating: true },
    });

    const ratingCount = reviews.length;
    const ratingAverage =
      reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount;

    await prisma.miniApp.update({
      where: { id: validated.miniAppId },
      data: {
        ratingCount,
        ratingAverage,
      },
    });

    // Award 10 points for rating (Rate 2 Earn)
    let pointsAwarded = 0;
    if (session && isNewReview) {
      // Only award points if this is a new review (not an update)
      const RATING_POINTS = 10; // Changed from 100 to 10
      
      try {
        // Find or create user points record
        let userPoints = await prisma.userPoints.findUnique({
          where: { wallet: session.wallet },
        });

        if (!userPoints) {
          userPoints = await prisma.userPoints.create({
            data: {
              wallet: session.wallet,
              totalPoints: RATING_POINTS,
            },
          });
        } else {
          // Update points
          userPoints = await prisma.userPoints.update({
            where: { wallet: session.wallet },
            data: {
              totalPoints: {
                increment: RATING_POINTS,
              },
            },
          });
        }

        // Create transaction record
        await prisma.pointsTransaction.create({
          data: {
            wallet: session.wallet,
            points: RATING_POINTS,
            type: "review",
            description: `Earned ${RATING_POINTS} points for rating "${app.name}"`,
            referenceId: review.id,
          },
        });

        pointsAwarded = RATING_POINTS;

        // Award 50 points to developer for receiving a review
        try {
          const developer = await prisma.developer.findUnique({
            where: { id: app.developerId },
          });

          if (developer && developer.wallet) {
            // Find or create developer's user points record
            let developerPoints = await prisma.userPoints.findUnique({
              where: { wallet: developer.wallet.toLowerCase() },
            });

            const DEVELOPER_REVIEW_POINTS = 50;

            if (!developerPoints) {
              developerPoints = await prisma.userPoints.create({
                data: {
                  wallet: developer.wallet.toLowerCase(),
                  totalPoints: DEVELOPER_REVIEW_POINTS,
                },
              });
            } else {
              developerPoints = await prisma.userPoints.update({
                where: { wallet: developer.wallet.toLowerCase() },
                data: {
                  totalPoints: {
                    increment: DEVELOPER_REVIEW_POINTS,
                  },
                },
              });
            }

            // Create transaction record for developer
            await prisma.pointsTransaction.create({
              data: {
                wallet: developer.wallet.toLowerCase(),
                points: DEVELOPER_REVIEW_POINTS,
                type: "review_received",
                description: `Earned ${DEVELOPER_REVIEW_POINTS} points for receiving a review on "${app.name}"`,
                referenceId: review.id,
              },
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
    if (ratingAverage > 3.0 && app.developer) {
      const DEVELOPER_XP = 100;
      
      try {
        // Award XP if rating just crossed 3.0 threshold (was <= 3.0, now > 3.0)
        const shouldAwardXP = previousRating <= 3.0 && ratingAverage > 3.0;
        
        if (shouldAwardXP) {
          // Check if developer already received XP for this app (prevent duplicate)
          const existingXP = await prisma.pointsTransaction.findFirst({
            where: {
              wallet: app.developer.wallet,
              type: "developer_rating",
              referenceId: validated.miniAppId,
            },
          });

          if (!existingXP) {
            // Find or create developer points record
            let devPoints = await prisma.userPoints.findUnique({
              where: { wallet: app.developer.wallet },
            });

            if (!devPoints) {
              devPoints = await prisma.userPoints.create({
                data: {
                  wallet: app.developer.wallet,
                  totalPoints: DEVELOPER_XP,
                },
              });
            } else {
              // Update points
              devPoints = await prisma.userPoints.update({
                where: { wallet: app.developer.wallet },
                data: {
                  totalPoints: {
                    increment: DEVELOPER_XP,
                  },
                },
              });
            }

            // Create transaction record
            await prisma.pointsTransaction.create({
              data: {
                wallet: app.developer.wallet,
                points: DEVELOPER_XP,
                type: "developer_rating",
                description: `Earned ${DEVELOPER_XP} XP - Your app "${app.name}" reached ${ratingAverage.toFixed(1)} stars!`,
                referenceId: validated.miniAppId,
              },
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

