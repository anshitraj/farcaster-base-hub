import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { verifyMessage } from "ethers";

const VERIFICATION_MESSAGE = "Verify your developer account for Mini App Store";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    // Fallback: check walletAddress cookie if DB session doesn't exist
    let wallet: string | null = null;
    if (session) {
      wallet = session.wallet;
    } else {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      const walletFromCookie = cookieStore.get("walletAddress")?.value;
      if (walletFromCookie) {
        wallet = walletFromCookie;
      }
    }
    
    if (!wallet) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { signature } = body;

    if (!signature || typeof signature !== "string") {
      return NextResponse.json(
        { error: "Signature is required" },
        { status: 400 }
      );
    }

    // Verify signature
    try {
      const recoveredAddress = verifyMessage(VERIFICATION_MESSAGE, signature).toLowerCase();
      
      if (recoveredAddress !== wallet.toLowerCase()) {
        return NextResponse.json(
          { error: "Signature does not match wallet address" },
          { status: 400 }
        );
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: `Invalid signature: ${error.message}` },
        { status: 400 }
      );
    }

    // Find or create developer
    let developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
    });

    if (!developer) {
      developer = await prisma.developer.create({
        data: {
          wallet: wallet.toLowerCase(),
        },
      });
    }

    // Update developer status - wallet verification is sufficient
    // Domain ownership is checked per-app via farcaster.json
    const newStatus = "verified";
    const isFullyVerified = true;

    await prisma.developer.update({
      where: { id: developer.id },
      data: {
        verificationStatus: newStatus,
        verified: isFullyVerified,
      },
    });

    return NextResponse.json({
      success: true,
      status: newStatus,
      verified: isFullyVerified,
      message: "Wallet verified! Your developer account is now verified. Add your wallet to farcaster.json owners for auto-approval of apps.",
    });
  } catch (error: any) {
    if (error?.code === 'P1001' || error?.message?.includes('Can\'t reach database')) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    
    console.error("Wallet verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify wallet" },
      { status: 500 }
    );
  }
}

