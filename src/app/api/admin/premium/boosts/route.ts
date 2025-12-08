import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentWallet } from "@/lib/auth";
import { Developer, BoostRequest, MiniApp } from "@/db/schema";
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

    const requestsData = await db.select({
      request: BoostRequest,
      app: MiniApp,
      developer: {
        name: Developer.name,
        wallet: Developer.wallet,
      },
    })
      .from(BoostRequest)
      .leftJoin(MiniApp, eq(BoostRequest.appId, MiniApp.id))
      .leftJoin(Developer, eq(BoostRequest.developerId, Developer.id))
      .orderBy(desc(BoostRequest.requestedAt));
    
    const requests = requestsData.map(({ request, app, developer }) => ({
      ...request,
      miniApp: app,
      developer,
    }));

    return NextResponse.json({ requests });
  } catch (error: any) {
    console.error("Get boost requests error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

