import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { Developer } from "@/db/schema";
import { eq } from "drizzle-orm";

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

    const walletLower = wallet.toLowerCase();
    // Find or create developer
    let developerResult = await db.select().from(Developer)
      .where(eq(Developer.wallet, walletLower))
      .limit(1);
    let developer = developerResult[0];

    if (!developer) {
      const [created] = await db.insert(Developer).values({
        wallet: walletLower,
      }).returning();
      developer = created;
    }

    // Generate nonce using Web Crypto API for Edge Runtime
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const nonce = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    // Update developer with nonce and domain
    await db.update(Developer)
      .set({
        verificationNonce: nonce,
        verificationDomain: domainUrl.origin,
      })
      .where(eq(Developer.id, developer.id));

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
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
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

