import { db } from "./db";
import { getSessionFromCookies } from "./auth";
import { Developer } from "@/db/schema";
import { eq } from "drizzle-orm";

export type AdminRole = "ADMIN" | "MODERATOR" | null;

/**
 * Get the current user's admin role
 */
export async function getAdminRole(): Promise<AdminRole> {
  try {
    const session = await getSessionFromCookies();
    
    // Fallback: check walletAddress cookie if DB session doesn't exist
    let wallet: string | null = null;
    if (session) {
      wallet = session.wallet;
    } else {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      
      // First try walletAddress cookie
      const walletFromCookie = cookieStore.get("walletAddress")?.value;
      if (walletFromCookie) {
        wallet = walletFromCookie;
      } else {
        // Fallback: check Farcaster session cookie
        const farcasterFid = cookieStore.get("farcasterSession")?.value;
        if (farcasterFid) {
          wallet = `farcaster:${farcasterFid}`;
        }
      }
    }
    
    if (!wallet) {
      return null;
    }

    // Normalize wallet to lowercase for consistent database queries
    const normalizedWallet = wallet.toLowerCase().trim();

    const developerResult = await db.select({ adminRole: Developer.adminRole })
      .from(Developer)
      .where(eq(Developer.wallet, normalizedWallet))
      .limit(1);
    const developer = developerResult[0];

    return developer?.adminRole || null;
  } catch (error: any) {
    // Don't log database connection errors as they're expected
    if (!error?.message?.includes('connection') && !error?.message?.includes('database')) {
      console.error("Error checking admin role:", error);
    }
    return null;
  }
}

/**
 * Check if the current user is an admin (backward compatibility)
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getAdminRole();
  return role === "ADMIN";
}

/**
 * Check if the current user is a moderator
 */
export async function isModerator(): Promise<boolean> {
  const role = await getAdminRole();
  return role === "MODERATOR";
}

/**
 * Check if the current user is an admin or moderator
 */
export async function isAdminOrModerator(): Promise<boolean> {
  const role = await getAdminRole();
  return role === "ADMIN" || role === "MODERATOR";
}

/**
 * Require admin access - throws error if not admin
 */
export async function requireAdmin() {
  const role = await getAdminRole();
  if (role !== "ADMIN") {
    throw new Error("Admin access required");
  }
}

/**
 * Require moderator access (admin or moderator) - throws error if neither
 */
export async function requireModerator() {
  const role = await getAdminRole();
  if (role !== "ADMIN" && role !== "MODERATOR") {
    throw new Error("Moderator access required");
  }
}

/**
 * Require admin access for operations that only admins can do (like delete, manage admins)
 */
export async function requireAdminOnly() {
  const role = await getAdminRole();
  if (role !== "ADMIN") {
    throw new Error("Admin-only operation. Moderators cannot perform this action.");
  }
}

/**
 * Check if the current user is admin or has developer level 5 or higher
 */
export async function isAdminOrLevel5(): Promise<boolean> {
  try {
    const session = await getSessionFromCookies();
    
    // Fallback: check walletAddress cookie if DB session doesn't exist
    let wallet: string | null = null;
    if (session) {
      wallet = session.wallet;
    } else {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      
      // First try walletAddress cookie
      const walletFromCookie = cookieStore.get("walletAddress")?.value;
      if (walletFromCookie) {
        wallet = walletFromCookie;
      } else {
        // Fallback: check Farcaster session cookie
        const farcasterFid = cookieStore.get("farcasterSession")?.value;
        if (farcasterFid) {
          wallet = `farcaster:${farcasterFid}`;
        }
      }
    }
    
    if (!wallet) {
      return false;
    }

    // Normalize wallet to lowercase for consistent database queries
    const normalizedWallet = wallet.toLowerCase().trim();

    const developerResult = await db.select({ 
      adminRole: Developer.adminRole,
      developerLevel: Developer.developerLevel 
    })
      .from(Developer)
      .where(eq(Developer.wallet, normalizedWallet))
      .limit(1);
    const developer = developerResult[0];

    if (!developer) {
      return false;
    }

    // Check if admin or level 5+
    const isAdmin = developer.adminRole === "ADMIN" || developer.adminRole === "MODERATOR";
    const isLevel5 = (developer.developerLevel || 0) >= 5;
    
    return isAdmin || isLevel5;
  } catch (error: any) {
    if (!error?.message?.includes('connection') && !error?.message?.includes('database')) {
      console.error("Error checking admin or level 5:", error);
    }
    return false;
  }
}

/**
 * Require admin or level 5+ access - throws error if not authorized
 */
export async function requireAdminOrLevel5() {
  const hasAccess = await isAdminOrLevel5();
  if (!hasAccess) {
    throw new Error("Admin or level 5+ access required");
  }
}