import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    if (!session) {
      return NextResponse.json({ wallet: null });
    }

    return NextResponse.json({ wallet: session.wallet });
  } catch (error) {
    console.error("Get auth/me error:", error);
    return NextResponse.json({ wallet: null });
  }
}

