import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { verifyMessage } from "ethers";
import { Developer } from "@/db/schema";
import { eq } from "drizzle-orm";

// Domain binding for security - ensures signature is for this specific domain
const getVerificationMessage = (domain?: string) => {
  const baseMessage = "Verify your developer account for Mini App Store";
  const appDomain = domain || process.env.NEXT_PUBLIC_BASE_URL || "minicast.store";
  return `${baseMessage}\n\nDomain: ${appDomain}`;
};

const VERIFICATION_MESSAGE = getVerificationMessage();

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
    let { signature, domain } = body;
    
    // Get the domain from request body, headers, or use default
    // The domain should match what the client used when signing
    const requestDomain = domain || request.headers.get("host")?.split(':')[0] || process.env.NEXT_PUBLIC_BASE_URL?.replace(/^https?:\/\//, '').split(':')[0] || "minicast.store";
    const verificationMessage = getVerificationMessage(requestDomain);

    if (!signature || typeof signature !== "string") {
      return NextResponse.json(
        { error: "Signature is required" },
        { status: 400 }
      );
    }

    // Log raw signature for debugging (first 50 chars only for security)
    console.log("Received signature:", {
      type: typeof signature,
      length: signature.length,
      preview: signature.substring(0, 50) + "...",
      endsWith: signature.substring(Math.max(0, signature.length - 10))
    });

    // Normalize signature: trim whitespace and remove any non-hex characters
    signature = signature.trim();
    
    // Remove any whitespace that might have been introduced
    signature = signature.replace(/\s+/g, "");
    
    // Ensure it starts with 0x
    if (!signature.startsWith("0x")) {
      signature = "0x" + signature;
    }
    
    // Convert to lowercase for consistency (hex is case-insensitive but ethers prefers lowercase)
    signature = signature.toLowerCase();
    
    // Validate signature format - should be a hex string starting with 0x
    if (!signature.startsWith("0x")) {
      return NextResponse.json(
        { error: "Invalid signature format: must start with 0x" },
        { status: 400 }
      );
    }

    // Check signature length - should be exactly 132 characters (0x + 130 hex chars)
    // Standard ECDSA signature is 65 bytes = 130 hex characters + 0x prefix
    if (signature.length !== 132) {
      console.error("Invalid signature length:", {
        length: signature.length,
        expected: 132,
        preview: signature.substring(0, 20) + "...",
        fullLength: signature.length
      });
      return NextResponse.json(
        { error: `Invalid signature: expected 132 characters, got ${signature.length}. Please try signing again.` },
        { status: 400 }
      );
    }
    
    // Validate it's valid hex
    if (!/^0x[a-f0-9]{130}$/.test(signature)) {
      return NextResponse.json(
        { error: "Invalid signature format: not a valid hex string. Please try signing again." },
        { status: 400 }
      );
    }

    // Verify signature
    try {
      // Use the normalized signature with domain-bound message
      const recoveredAddress = verifyMessage(verificationMessage, signature).toLowerCase();
      
      if (recoveredAddress !== wallet.toLowerCase()) {
        return NextResponse.json(
          { error: "Signature does not match wallet address" },
          { status: 400 }
        );
      }
    } catch (error: any) {
      // Provide more helpful error messages
      let errorMessage = "Invalid signature";
      if (error.message?.includes("invalid raw signature length")) {
        errorMessage = "Invalid signature format. The signature appears to be corrupted. Please try signing the message again.";
      } else if (error.message?.includes("invalid signature")) {
        errorMessage = `Invalid signature. Please ensure you're signing the correct message with domain binding: '${verificationMessage}'`;
      } else if (error.message?.includes("malformed")) {
        errorMessage = "Invalid signature format. Please try signing the message again.";
      } else {
        errorMessage = `Invalid signature: ${error.message || "Unknown error"}`;
      }
      
      console.error("Signature verification error:", {
        error: error.message,
        errorCode: error.code,
        signatureLength: signature.length,
        signaturePrefix: signature.substring(0, 20),
        signatureSuffix: signature.substring(signature.length - 10),
        isValidHex: /^0x[a-f0-9]{130}$/.test(signature),
      });
      
      return NextResponse.json(
        { error: errorMessage },
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
      const [newDeveloper] = await db.insert(Developer).values({
        wallet: walletLower,
      }).returning();
      developer = newDeveloper;
    }

    // Update developer status - wallet verification is sufficient
    // Domain ownership is checked per-app via farcaster.json
    const newStatus = "verified";
    const isFullyVerified = true;

    await db.update(Developer)
      .set({
        verificationStatus: newStatus,
        verified: isFullyVerified,
      })
      .where(eq(Developer.id, developer.id));

    return NextResponse.json({
      success: true,
      status: newStatus,
      verified: isFullyVerified,
      message: "Wallet verified! Your developer account is now verified. Add your wallet to farcaster.json owners for auto-approval of apps.",
    });
  } catch (error: any) {
    if (error?.message?.includes("connection") || error?.message?.includes("database")) {
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

