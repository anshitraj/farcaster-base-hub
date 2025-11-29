import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const fid = cookieStore.get("farcasterSession")?.value;

    if (!fid) {
      return NextResponse.json({ farcaster: null });
    }

    const farcasterWallet = `farcaster:${fid}`;
    const developer = await prisma.developer.findUnique({
      where: { wallet: farcasterWallet },
    });

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

