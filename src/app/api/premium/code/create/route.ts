import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const wallet = await getCurrentWallet();
    if (!wallet) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Check if user has active premium subscription
    const subscription = await prisma.premiumSubscription.findFirst({
      where: {
        wallet: wallet.toLowerCase(),
        status: "active",
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "Premium subscription required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { appId, expiresInDays } = body;

    if (!appId) {
      return NextResponse.json(
        { error: "appId is required" },
        { status: 400 }
      );
    }

    // Verify user owns the app
    const app = await prisma.miniApp.findUnique({
      where: { id: appId },
      include: { developer: true },
    });

    if (!app) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }

    if (app.developer.wallet.toLowerCase() !== wallet.toLowerCase()) {
      return NextResponse.json(
        { error: "You can only create access codes for your own apps" },
        { status: 403 }
      );
    }

    // Generate unique code
    const code = `PREMIUM-${crypto.randomBytes(8).toString("hex").toUpperCase()}`;

    // Calculate expiration
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create access code
    const accessCode = await prisma.accessCode.create({
      data: {
        code,
        appId,
        ownerId: wallet.toLowerCase(),
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      code: accessCode.code,
      expiresAt: accessCode.expiresAt,
      message: "Access code created successfully",
    });
  } catch (error: any) {
    console.error("Create access code error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create access code" },
      { status: 500 }
    );
  }
}

