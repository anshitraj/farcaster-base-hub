import { prisma } from "./db";
import { getSessionFromCookies } from "./auth";

/**
 * Check if the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
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
      return false;
    }

    const developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
      select: { isAdmin: true },
    });

    return developer?.isAdmin || false;
  } catch (error: any) {
    // Don't log database connection errors as they're expected
    if (!error?.code?.includes('P1001') && !error?.message?.includes('Can\'t reach database')) {
      console.error("Error checking admin status:", error);
    }
    return false;
  }
}

/**
 * Require admin access - throws error if not admin
 */
export async function requireAdmin() {
  const admin = await isAdmin();
  if (!admin) {
    throw new Error("Admin access required");
  }
}

