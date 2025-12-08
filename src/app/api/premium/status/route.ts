import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";
import { PremiumSubscription } from "@/db/schema";
import { eq, and, desc, lte, gt, sql } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const wallet = await getCurrentWallet();
    if (!wallet) {
      return NextResponse.json({
        status: "none",
        isPremium: false,
      });
    }

    const walletLower = wallet.toLowerCase();
    // Find active subscription
    const subscriptionResult = await db.select().from(PremiumSubscription)
      .where(and(
        eq(PremiumSubscription.wallet, walletLower),
        eq(PremiumSubscription.status, "active"),
        sql`${PremiumSubscription.expiresAt} > NOW()`
      ))
      .orderBy(desc(PremiumSubscription.expiresAt))
      .limit(1);
    const subscription = subscriptionResult[0];

    if (!subscription) {
      // Check for expired subscriptions
      const expiredResult = await db.select().from(PremiumSubscription)
        .where(and(
          eq(PremiumSubscription.wallet, walletLower),
          lte(PremiumSubscription.expiresAt, new Date())
        ))
        .orderBy(desc(PremiumSubscription.expiresAt))
        .limit(1);
      const expired = expiredResult[0];

      if (expired) {
        // Auto-update expired subscriptions
        await db.update(PremiumSubscription)
          .set({ status: "expired" })
          .where(eq(PremiumSubscription.id, expired.id));
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

