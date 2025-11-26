import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import crypto from "crypto";

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
    const { domain } = body;

    if (!domain || typeof domain !== "string") {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }

    // Validate domain format
    let domainUrl: URL;
    try {
      domainUrl = new URL(domain);
      if (!["http:", "https:"].includes(domainUrl.protocol)) {
        return NextResponse.json(
          { error: "Domain must use http:// or https://" },
          { status: 400 }
        );
      }
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid domain format" },
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

    // Generate nonce
    const nonce = crypto.randomBytes(16).toString("hex");

    // Update developer with nonce and domain
    await prisma.developer.update({
      where: { id: developer.id },
      data: {
        verificationNonce: nonce,
        verificationDomain: domainUrl.origin,
      },
    });

    // Generate verification file content
    const verificationContent = `wallet: ${wallet.toLowerCase()}\nnonce: ${nonce}`;

    return NextResponse.json({
      success: true,
      nonce,
      domain: domainUrl.origin,
      instructions: {
        filePath: "/.well-known/miniapp-verification.txt",
        fileContent: verificationContent,
      },
    });
  } catch (error: any) {
    if (error?.code === 'P1001' || error?.message?.includes('Can\'t reach database')) {
      return NextResponse.json(
        { error: "Database temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }
    
    console.error("Domain verification start error:", error);
    return NextResponse.json(
      { error: "Failed to start domain verification" },
      { status: 500 }
    );
  }
}

