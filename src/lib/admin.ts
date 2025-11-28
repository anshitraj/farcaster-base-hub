import { prisma } from "./db";
import { getSessionFromCookies } from "./auth";

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
      const walletFromCookie = cookieStore.get("walletAddress")?.value;
      if (walletFromCookie) {
        wallet = walletFromCookie;
      }
    }
    
    if (!wallet) {
      return null;
    }

    const developer = await prisma.developer.findUnique({
      where: { wallet: wallet.toLowerCase() },
      select: { adminRole: true },
    });

    return developer?.adminRole || null;
  } catch (error: any) {
    // Don't log database connection errors as they're expected
    if (!error?.code?.includes('P1001') && !error?.message?.includes('Can\'t reach database')) {
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
