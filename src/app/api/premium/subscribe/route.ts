import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";
import { sponsorTransactionWithPaymaster } from "@/lib/coinbase-api";
import { ethers } from "ethers";

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

    // Check if user already has an active subscription
    const existingSubscription = await prisma.premiumSubscription.findFirst({
      where: {
        wallet: wallet.toLowerCase(),
        status: "active",
        expiresAt: {
          gt: new Date(),
        },
      },
    });

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
    const subscription = await prisma.premiumSubscription.create({
      data: {
        userId: wallet.toLowerCase(),
        wallet: wallet.toLowerCase(),
        status: "active",
        startedAt: new Date(),
        expiresAt,
        renewalCount: 0,
        txHash: txHash || null,
      },
    });

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

