import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { Developer, Badge } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    if (!session || !session.wallet) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const wallet = session.wallet.toLowerCase();

    // Get developer
    const developerResult = await db.select()
      .from(Developer)
      .where(eq(Developer.wallet, wallet))
      .limit(1);

    const developer = developerResult[0];
    if (!developer) {
      return NextResponse.json(
        { badges: [] },
        { status: 200 }
      );
    }

    // Get all claimed badges for this developer - select only columns that exist in DB
    const badges = await db.select({
      id: Badge.id,
      name: Badge.name,
      imageUrl: Badge.imageUrl,
      appName: Badge.appName,
      appId: Badge.appId,
      developerId: Badge.developerId,
      badgeType: Badge.badgeType,
      txHash: Badge.txHash,
      claimed: Badge.claimed,
      metadataUri: Badge.metadataUri,
      tokenId: Badge.tokenId,
      createdAt: Badge.createdAt,
      claimedAt: Badge.claimedAt,
    })
      .from(Badge)
      .where(eq(Badge.developerId, developer.id))
      .orderBy(Badge.createdAt);

    return NextResponse.json({
      badges: badges.filter(b => b.claimed),
    });
  } catch (error) {
    console.error("Error fetching badges:", error);
    return NextResponse.json(
      { error: "Failed to fetch badges" },
      { status: 500 }
    );
  }
}

