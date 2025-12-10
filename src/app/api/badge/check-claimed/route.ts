import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { hasClaimedBadge } from "@/lib/badgeContract";

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    if (!session || !session.wallet) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { appIds } = body;

    if (!appIds || !Array.isArray(appIds)) {
      return NextResponse.json(
        { error: "appIds array is required" },
        { status: 400 }
      );
    }

    const wallet = session.wallet.toLowerCase();
    const claimStatus: Record<string, boolean> = {};

    // Check claim status for each appId
    await Promise.all(
      appIds.map(async (appId: string) => {
        try {
          const claimed = await hasClaimedBadge(wallet, appId);
          claimStatus[appId] = claimed;
        } catch (error) {
          console.error(`Error checking claim status for appId ${appId}:`, error);
          claimStatus[appId] = false;
        }
      })
    );

    return NextResponse.json({
      claimStatus,
    });
  } catch (error) {
    console.error("Error checking badge claim status:", error);
    return NextResponse.json(
      { error: "Failed to check badge claim status" },
      { status: 500 }
    );
  }
}

