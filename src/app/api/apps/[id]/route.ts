import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const app = await prisma.miniApp.findUnique({
      where: { id: params.id },
      include: {
        developer: {
          select: {
            id: true,
            wallet: true,
            name: true,
            avatar: true,
            bio: true,
          },
        },
        reviews: {
          include: {
            developer: {
              select: {
                id: true,
                wallet: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      app: {
        id: app.id,
        name: app.name,
        description: app.description,
        url: app.url,
        baseMiniAppUrl: app.baseMiniAppUrl,
        farcasterUrl: app.farcasterUrl,
        iconUrl: app.iconUrl,
        category: app.category,
        verified: app.verified,
        contractAddress: app.contractAddress,
        contractVerified: app.contractVerified,
        developerTags: app.developerTags || [],
        screenshots: app.screenshots || [],
        lastUpdatedAt: app.lastUpdatedAt,
        launchCount: app.launchCount || 0,
        uniqueUsers: app.uniqueUsers || 0,
        popularityScore: app.popularityScore || 0,
        clicks: app.clicks,
        installs: app.installs,
        ratingAverage: app.ratingAverage,
        ratingCount: app.ratingCount,
        createdAt: app.createdAt,
        developer: {
          ...app.developer,
          verified: app.developer.verified,
        },
      },
      reviews: app.reviews.map((review) => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
        developerReviewer: review.developer ? {
          ...review.developer,
        } : null,
      })),
    });
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
    const app = await prisma.miniApp.findUnique({
      where: { id: params.id },
      include: { developer: true },
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    // Verify the user owns this app
    if (app.developer.wallet.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json(
        { error: "You can only delete your own apps" },
        { status: 403 }
      );
    }

    // Delete app (cascade will delete reviews, events, etc.)
    await prisma.miniApp.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error?.code === 'P1001' || error?.message?.includes('Can\'t reach database')) {
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

