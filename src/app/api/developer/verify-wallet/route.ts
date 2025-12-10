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

    // Normalize signature: handle different formats from Base App mobile
    // Base App might return JSON-encoded signatures or other formats
    let normalizedSignature = signature;
    
    // Try to parse as JSON if it looks like JSON (starts with { or [)
    if ((signature.trim().startsWith("{") || signature.trim().startsWith("[")) && signature.length > 100) {
      try {
        const parsed = JSON.parse(signature);
        // Extract signature from common JSON formats
        if (parsed.signature) {
          normalizedSignature = parsed.signature;
        } else if (parsed.sig) {
          normalizedSignature = parsed.sig;
        } else if (typeof parsed === "string") {
          normalizedSignature = parsed;
        }
        console.log("Extracted signature from JSON format");
      } catch (e) {
        // Not JSON, continue with original
      }
    }
    
    // Normalize signature: trim whitespace and remove any non-hex characters
    normalizedSignature = normalizedSignature.trim();
    
    // Remove any whitespace that might have been introduced
    normalizedSignature = normalizedSignature.replace(/\s+/g, "");
    
    // Extract hex string if it's embedded in other text
    // Look for a pattern that looks like a hex signature (0x followed by hex chars)
    const hexMatch = normalizedSignature.match(/0x[a-fA-F0-9]{128,132}/);
    if (hexMatch && normalizedSignature.length > 132) {
      normalizedSignature = hexMatch[0];
      console.log("Extracted hex signature from longer string");
    }
    
    // Ensure it starts with 0x
    if (!normalizedSignature.startsWith("0x")) {
      // Try to find hex pattern without 0x prefix
      const hexWithoutPrefix = normalizedSignature.match(/[a-fA-F0-9]{128,132}/);
      if (hexWithoutPrefix) {
        normalizedSignature = "0x" + hexWithoutPrefix[0];
      } else {
        normalizedSignature = "0x" + normalizedSignature;
      }
    }
    
    // Convert to lowercase for consistency (hex is case-insensitive but ethers prefers lowercase)
    normalizedSignature = normalizedSignature.toLowerCase();
    
    // Validate signature format - should be a hex string starting with 0x
    if (!normalizedSignature.startsWith("0x")) {
      return NextResponse.json(
        { error: "Invalid signature format: must start with 0x" },
        { status: 400 }
      );
    }

    // Check signature length - should be exactly 132 characters (0x + 130 hex chars)
    // Standard ECDSA signature is 65 bytes = 130 hex characters + 0x prefix
    // But allow slightly longer signatures and trim if needed (some wallets add extra chars)
    if (normalizedSignature.length < 132) {
      console.error("Invalid signature length (too short):", {
        length: normalizedSignature.length,
        expected: 132,
        preview: normalizedSignature.substring(0, 20) + "...",
      });
      return NextResponse.json(
        { error: `Invalid signature: expected at least 132 characters, got ${normalizedSignature.length}. Please try signing again.` },
        { status: 400 }
      );
    }
    
    // If signature is longer than 132, try to extract the first 132 characters
    if (normalizedSignature.length > 132) {
      // Take first 132 characters (0x + 130 hex)
      const trimmed = normalizedSignature.substring(0, 132);
      if (/^0x[a-f0-9]{130}$/.test(trimmed)) {
        normalizedSignature = trimmed;
        console.log("Trimmed signature to 132 characters");
      } else {
        console.error("Invalid signature length (too long and can't trim):", {
          length: normalizedSignature.length,
          expected: 132,
          preview: normalizedSignature.substring(0, 20) + "...",
        });
        return NextResponse.json(
          { error: `Invalid signature format: expected 132 characters, got ${normalizedSignature.length}. Please try signing again.` },
          { status: 400 }
        );
      }
    }
    
    // Validate it's valid hex
    if (!/^0x[a-f0-9]{130}$/.test(normalizedSignature)) {
      return NextResponse.json(
        { error: "Invalid signature format: not a valid hex string. Please try signing again." },
        { status: 400 }
      );
    }
    
    // Use normalized signature
    signature = normalizedSignature;

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

