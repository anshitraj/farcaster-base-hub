import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";
import { Developer, PremiumApp } from "@/db/schema";
import { eq } from "drizzle-orm";


export const runtime = "edge";
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  );
}

export async function DELETE(
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

    const appId = params.id;

    // Delete premium app
    await db.delete(PremiumApp).where(eq(PremiumApp.miniAppId, appId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete premium app error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

