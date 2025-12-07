import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";
import { PremiumSubscription } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const wallet = await getCurrentWallet();
    if (!wallet) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const walletLower = wallet.toLowerCase();
    // Find active subscription
    const subscriptionResult = await db.select().from(PremiumSubscription)
      .where(and(
        eq(PremiumSubscription.wallet, walletLower),
        eq(PremiumSubscription.status, "active")
      ))
      .limit(1);
    const subscription = subscriptionResult[0];

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Cancel subscription (don't delete, mark as canceled)
    const [canceled] = await db.update(PremiumSubscription)
      .set({ status: "canceled" })
      .where(eq(PremiumSubscription.id, subscription.id))
      .returning();

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

