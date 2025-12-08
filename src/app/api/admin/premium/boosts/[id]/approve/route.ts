import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";
import { Developer, BoostRequest, MiniApp } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await getCurrentWallet();
    if (!wallet) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const walletLower = wallet.toLowerCase();
    // Check if admin (premium features are admin-only)
    const developerResult = await db.select({ adminRole: Developer.adminRole })
      .from(Developer)
      .where(eq(Developer.wallet, walletLower))
      .limit(1);
    const developer = developerResult[0];

    if (!developer || developer.adminRole !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const requestId = params.id;

    // Get current boost request
    const boostRequestResult = await db.select().from(BoostRequest)
      .where(eq(BoostRequest.id, requestId))
      .limit(1);
    const currentRequest = boostRequestResult[0];
    
    if (!currentRequest) {
      return NextResponse.json({ error: "Boost request not found" }, { status: 404 });
    }

    // Approve boost request
    const [boostRequest] = await db.update(BoostRequest)
      .set({
        status: "approved",
        approvedAt: new Date(),
        approvedBy: walletLower,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      })
      .where(eq(BoostRequest.id, requestId))
      .returning();

    // Apply boost to app (increase trending score)
    const appResult = await db.select().from(MiniApp)
      .where(eq(MiniApp.id, boostRequest.appId))
      .limit(1);
    const app = appResult[0];
    
    if (app) {
      await db.update(MiniApp)
        .set({
          popularityScore: app.popularityScore + 100, // Boost score
        })
        .where(eq(MiniApp.id, boostRequest.appId));
    }

    return NextResponse.json({ success: true, boostRequest });
  } catch (error: any) {
    console.error("Approve boost error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

