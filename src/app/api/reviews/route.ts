import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
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

    // Get developer if session exists
    let developerId: string | undefined;
    if (session) {
      const developer = await prisma.developer.findUnique({
        where: { wallet: session.wallet },
      });
      developerId = developer?.id;
    }

    // Check if user already reviewed this app (to prevent duplicate points)
    let existingReview = null;
    if (session) {
      const developer = await prisma.developer.findUnique({
        where: { wallet: session.wallet },
      });
      if (developer) {
        existingReview = await prisma.review.findFirst({
          where: {
            miniAppId: validated.miniAppId,
            developerId: developer.id,
          },
        });
      }
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        miniAppId: validated.miniAppId,
        rating: validated.rating,
        comment: validated.comment,
        developerId,
      },
    });

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

    // Award 100 points for rating (Rate 2 Earn)
    let pointsAwarded = 0;
    if (session && !existingReview) {
      // Only award points if this is a new review (not an update)
      const RATING_POINTS = 100;
      
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

