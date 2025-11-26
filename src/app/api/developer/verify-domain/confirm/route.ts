import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

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

    const developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
    });

    if (!developer) {
      return NextResponse.json(
        { error: "Developer not found" },
        { status: 404 }
      );
    }

    if (!developer.verificationDomain || !developer.verificationNonce) {
      return NextResponse.json(
        { error: "Please start domain verification first" },
        { status: 400 }
      );
    }

    // Fetch verification file
    const verificationUrl = `${developer.verificationDomain}/.well-known/miniapp-verification.txt`;
    
    let verificationContent: string;
    try {
      const response = await fetch(verificationUrl, {
        method: "GET",
        headers: {
          "User-Agent": "MiniAppStore-Verification/1.0",
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Could not fetch verification file. Status: ${response.status}` },
          { status: 400 }
        );
      }

      verificationContent = await response.text();
    } catch (error: any) {
      return NextResponse.json(
        { error: `Failed to fetch verification file: ${error.message}` },
        { status: 400 }
      );
    }

    // Parse verification file
    const lines = verificationContent.split("\n").map((line) => line.trim());
    const walletLine = lines.find((line) => line.startsWith("wallet:"));
    const nonceLine = lines.find((line) => line.startsWith("nonce:"));

    if (!walletLine || !nonceLine) {
      return NextResponse.json(
        { error: "Verification file is missing required fields" },
        { status: 400 }
      );
    }

    const fileWallet = walletLine.split(":")[1]?.trim().toLowerCase();
    const fileNonce = nonceLine.split(":")[1]?.trim();

    // Validate wallet and nonce
    if (fileWallet !== wallet.toLowerCase()) {
      return NextResponse.json(
        { error: "Wallet address in verification file does not match" },
        { status: 400 }
      );
    }

    if (fileNonce !== developer.verificationNonce) {
      return NextResponse.json(
        { error: "Nonce in verification file does not match" },
        { status: 400 }
      );
    }

    // Update developer status
    const walletVerified = developer.verificationStatus === "wallet_verified" || developer.verificationStatus === "verified";
    const newStatus = walletVerified ? "verified" : "domain_verified";
    const isFullyVerified = walletVerified || developer.isAdmin;

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
      message: isFullyVerified
        ? "Domain verified! Your developer account is now fully verified."
        : "Domain verified! Please also verify your wallet to complete verification.",
    });
  } catch (error: any) {
    if (error?.code === 'P1001' || error?.message?.includes('Can\'t reach database')) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    
    console.error("Domain verification confirm error:", error);
    return NextResponse.json(
      { error: "Failed to confirm domain verification" },
      { status: 500 }
    );
  }
}

