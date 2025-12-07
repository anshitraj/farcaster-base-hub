import { db } from "./db";
import { UserSession, Developer } from "@/db/schema";
import { cookies } from "next/headers";
import { eq, or } from "drizzle-orm";

// Use Web Crypto API for Edge Runtime compatibility
function generateSessionToken(): string {
  // Web Crypto API is available in both Edge and Node.js runtimes in Next.js
  const array = new Uint8Array(32);
  globalThis.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function createWalletSession(wallet: string) {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  try {
    const [session] = await db.insert(UserSession).values({
      wallet: wallet.toLowerCase(),
      sessionToken,
      expiresAt,
    }).returning();
    
    return session;
  } catch (error: any) {
    // If database is unavailable, throw a specific error that the API route can handle
    if (error?.message?.includes('connection') || error?.message?.includes('database')) {
      const dbError = new Error('Database unavailable');
      (dbError as any).isDatabaseError = true;
      throw dbError;
    }
    // Re-throw other errors
    throw error;
  }
}

export async function getSessionFromToken(token: string | undefined) {
  if (!token) return null;
  
  try {
    // Optimize: Only select needed fields for faster query
    const sessionResult = await db
      .select({
        wallet: UserSession.wallet,
        sessionToken: UserSession.sessionToken,
        expiresAt: UserSession.expiresAt,
      })
      .from(UserSession)
      .where(eq(UserSession.sessionToken, token))
      .limit(1);
    const session = sessionResult[0];
    
    if (!session || session.expiresAt < new Date()) return null;
    
    return session;
  } catch (error: any) {
    // Database connection error - return null gracefully
    // The API route will fall back to checking walletAddress cookie
    if (error?.message?.includes('connection') || error?.message?.includes('database')) {
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

export async function getSessionFromCookies() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("sessionToken")?.value;
    return await getSessionFromToken(token);
  } catch (error: any) {
    // Database connection error - return null gracefully
    if (error?.message?.includes('connection') || error?.message?.includes('database')) {
      return null;
    }
    // Re-throw other errors
    throw error;
  }
}

export async function getCurrentWallet(): Promise<string | null> {
  const session = await getSessionFromCookies();
  return session?.wallet || null;
}

/**
 * Get Farcaster session data from cookies
 */
export async function getFarcasterSession() {
  try {
    const cookieStore = await cookies();
    const fid = cookieStore.get("fid")?.value;
    const sessionToken = cookieStore.get("sessionToken")?.value;
    
    if (!fid || !sessionToken) {
      return null;
    }

    // Verify session is still valid
    const session = await getSessionFromToken(sessionToken);
    if (!session) {
      return null;
    }

    // Get developer data
    const developerResult = await db.select().from(Developer)
      .where(or(
        eq(Developer.wallet, `farcaster:${fid}`),
        eq(Developer.wallet, session.wallet)
      ))
      .limit(1);
    const developer = developerResult[0];

    return {
      fid: parseInt(fid),
      sessionToken,
      wallet: session.wallet,
      developer,
    };
  } catch (error) {
    console.error("Error getting Farcaster session:", error);
    return null;
  }
}

