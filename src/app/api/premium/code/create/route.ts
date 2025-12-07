import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";
import { PremiumSubscription, MiniApp, Developer, AccessCode } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

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
    // Check if user has active premium subscription
    const subscriptionResult = await db.select().from(PremiumSubscription)
      .where(and(
        eq(PremiumSubscription.wallet, walletLower),
        eq(PremiumSubscription.status, "active"),
        sql`${PremiumSubscription.expiresAt} > NOW()`
      ))
      .limit(1);
    const subscription = subscriptionResult[0];

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
    const appResult = await db.select({
      app: MiniApp,
      developer: Developer,
    })
      .from(MiniApp)
      .leftJoin(Developer, eq(MiniApp.developerId, Developer.id))
      .where(eq(MiniApp.id, appId))
      .limit(1);
    const appData = appResult[0];
    
    if (!appData) {
      return NextResponse.json(
        { error: "App not found" },
        { status: 404 }
      );
    }
    const app = { ...appData.app, developer: appData.developer };

    if (!app.developer || app.developer.wallet.toLowerCase() !== walletLower) {
      return NextResponse.json(
        { error: "You can only create access codes for your own apps" },
        { status: 403 }
      );
    }

    // Generate unique code using Web Crypto API for Edge Runtime
    const randomBytes = new Uint8Array(8);
    crypto.getRandomValues(randomBytes);
    const code = `PREMIUM-${Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()}`;

    // Calculate expiration
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create access code
    const [accessCode] = await db.insert(AccessCode).values({
      code,
      appId,
      ownerId: walletLower,
      expiresAt,
    }).returning();

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

