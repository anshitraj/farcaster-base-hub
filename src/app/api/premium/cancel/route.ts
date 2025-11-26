import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const wallet = await getCurrentWallet();
    if (!wallet) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Find active subscription
    const subscription = await prisma.premiumSubscription.findFirst({
      where: {
        wallet: wallet.toLowerCase(),
        status: "active",
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Cancel subscription (don't delete, mark as canceled)
    const canceled = await prisma.premiumSubscription.update({
      where: {
        id: subscription.id,
      },
      data: {
        status: "canceled",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription canceled successfully",
      subscription: {
        id: canceled.id,
        status: canceled.status,
        expiresAt: canceled.expiresAt,
      },
    });
  } catch (error: any) {
    console.error("Premium cancel error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}

