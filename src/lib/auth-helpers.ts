/**
 * Client-side auth helpers
 * For reading Farcaster user data from localStorage
 */

export interface FarcasterUser {
  fid: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  bio?: string;
  signature?: string;
  message?: string;
}

/**
 * Get current Farcaster user from localStorage
 */
export function getCurrentUser(): FarcasterUser | null {
  if (typeof window === "undefined") return null;
  
  try {
    const userStr = localStorage.getItem("fc_user");
    if (!userStr) return null;
    
    const user = JSON.parse(userStr) as FarcasterUser;
    return user;
  } catch (error) {
    console.error("Error reading fc_user from localStorage:", error);
    return null;
  }
}

/**
 * Clear Farcaster user from localStorage
 */
export function clearCurrentUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("fc_user");
}

/**
 * Check if user is authenticated (has Farcaster user or wallet session)
 */
export async function isAuthenticated(): Promise<boolean> {
  // Check Farcaster user
  const fcUser = getCurrentUser();
  if (fcUser) return true;

  // Check wallet session
  try {
    const res = await fetch("/api/auth/wallet", {
      method: "GET",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

