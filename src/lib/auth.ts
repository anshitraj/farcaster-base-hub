import { prisma } from "./db";
import crypto from "crypto";
import { cookies } from "next/headers";

export async function createWalletSession(wallet: string) {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  
  try {
    const session = await prisma.userSession.create({
      data: { 
        wallet: wallet.toLowerCase(), 
        sessionToken, 
        expiresAt 
      },
    });
    
    return session;
  } catch (error: any) {
    // If database is unavailable, throw a specific error that the API route can handle
    if (error?.code === 'P1001' || error?.message?.includes('Can\'t reach database')) {
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
    const session = await prisma.userSession.findUnique({
      where: { sessionToken: token },
    });
    
    if (!session || session.expiresAt < new Date()) return null;
    
    return session;
  } catch (error: any) {
    // Database connection error - return null gracefully
    // The API route will fall back to checking walletAddress cookie
    if (error?.code === 'P1001' || error?.message?.includes('Can\'t reach database')) {
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
    if (error?.code === 'P1001' || error?.message?.includes('Can\'t reach database')) {
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
    const developer = await prisma.developer.findFirst({
      where: {
        OR: [
          { wallet: `farcaster:${fid}` },
          { wallet: session.wallet },
        ],
      },
    });

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

