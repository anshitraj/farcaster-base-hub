import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { Developer } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = 'force-dynamic';
export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const fid = cookieStore.get("farcasterSession")?.value;

    if (!fid) {
      return NextResponse.json({ farcaster: null });
    }

    const farcasterWallet = `farcaster:${fid}`;
    const developerResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, farcasterWallet))
      .limit(1);
    const developer = developerResult[0];

    if (!developer) {
      return NextResponse.json({ farcaster: null });
    }

    return NextResponse.json({
      farcaster: {
        fid,
        name: developer.name,
        avatar: developer.avatar,
        wallet: developer.wallet,
      },
    });
  } catch (error) {
    console.error("Get Farcaster user error:", error);
    return NextResponse.json({ farcaster: null });
  }
}

