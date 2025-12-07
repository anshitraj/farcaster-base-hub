import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";
import { Developer, PremiumSubscription } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET(request: NextRequest) {
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

    const subscribers = await db.select().from(PremiumSubscription)
      .orderBy(desc(PremiumSubscription.createdAt));

    return NextResponse.json({ subscribers });
  } catch (error: any) {
    console.error("Get subscribers error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

