import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";
import { getPaymasterSponsorship } from "@/lib/coinbase-api";
import { ethers } from "ethers";
import { PremiumSubscription } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

const PREMIUM_PRICE_USD = 5.99;
const PREMIUM_PRICE_USDC = ethers.parseUnits(PREMIUM_PRICE_USD.toString(), 6); // USDC has 6 decimals

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
    // Check if user already has an active subscription
    const existingSubscriptionResult = await db.select().from(PremiumSubscription)
      .where(and(
        eq(PremiumSubscription.wallet, walletLower),
        eq(PremiumSubscription.status, "active"),
        sql`${PremiumSubscription.expiresAt} > NOW()`
      ))
      .limit(1);
    const existingSubscription = existingSubscriptionResult[0];

    if (existingSubscription) {
      return NextResponse.json(
        { error: "You already have an active subscription" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { txHash } = body;

    // In production, verify the transaction on-chain
    // For now, we'll create the subscription record
    // You should verify txHash on Base network

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days subscription

    // Create new subscription (we already checked there's no active one)
    const [subscription] = await db.insert(PremiumSubscription).values({
      userId: walletLower,
      wallet: walletLower,
      status: "active",
      startedAt: new Date(),
      expiresAt,
      renewalCount: 0,
      txHash: txHash || null,
    }).returning();

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        expiresAt: subscription.expiresAt,
      },
    });
  } catch (error: any) {
    console.error("Premium subscription error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create subscription" },
      { status: 500 }
    );
  }
}

