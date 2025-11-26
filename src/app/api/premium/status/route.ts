import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const wallet = await getCurrentWallet();
    if (!wallet) {
      return NextResponse.json({
        status: "none",
        isPremium: false,
      });
    }

    // Find active subscription
    const subscription = await prisma.premiumSubscription.findFirst({
      where: {
        wallet: wallet.toLowerCase(),
        status: "active",
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        expiresAt: "desc",
      },
    });

    if (!subscription) {
      // Check for expired subscriptions
      const expired = await prisma.premiumSubscription.findFirst({
        where: {
          wallet: wallet.toLowerCase(),
          expiresAt: {
            lte: new Date(),
          },
        },
        orderBy: {
          expiresAt: "desc",
        },
      });

      if (expired) {
        // Auto-update expired subscriptions
        await prisma.premiumSubscription.update({
          where: {
            id: expired.id,
          },
          data: {
            status: "expired",
          },
        });
      }

      return NextResponse.json({
        status: expired ? "expired" : "none",
        isPremium: false,
      });
    }

    return NextResponse.json({
      status: subscription.status,
      isPremium: true,
      expiresAt: subscription.expiresAt,
      startedAt: subscription.startedAt,
      renewalCount: subscription.renewalCount,
    });
  } catch (error: any) {
    console.error("Premium status error:", error);
    return NextResponse.json({
      status: "none",
      isPremium: false,
      error: error.message,
    });
  }
}

