import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletParam = searchParams.get("wallet");
    
    // Get wallet from query param or session
    let wallet: string | null = null;
    
    if (walletParam) {
      wallet = walletParam.toLowerCase().trim();
    } else {
      // Fallback to session
      const session = await getSessionFromCookies();
      if (session) {
        wallet = session.wallet.toLowerCase().trim();
      } else {
        // Try cookie fallback
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        const walletFromCookie = cookieStore.get("walletAddress")?.value;
        if (walletFromCookie) {
          wallet = walletFromCookie.toLowerCase().trim();
        }
      }
    }
    
    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet address required" },
        { status: 400 }
      );
    }

    // Validate wallet format
    const isEthereumAddress = /^0x[a-fA-F0-9]{40}$/.test(wallet);
    const isFarcasterWallet = /^farcaster:\d+$/.test(wallet);
    
    if (!isEthereumAddress && !isFarcasterWallet) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Get developer record (includes adminRole)
    const developer = await prisma.developer.findUnique({
      where: { wallet },
      select: {
        id: true,
        wallet: true,
        name: true,
        avatar: true,
        bio: true,
        verified: true,
        adminRole: true, // This is the key field for admin status
      },
    });

    // Check admin status directly from developer.adminRole
    // This is the most reliable way since we're checking a specific wallet
    // adminRole can be "ADMIN", "MODERATOR", or null
    let isAdminUser = false;
    if (developer?.adminRole) {
      // Both ADMIN and MODERATOR should have admin access
      isAdminUser = developer.adminRole === "ADMIN" || developer.adminRole === "MODERATOR";
    }
    
    // Log for debugging (remove in production if needed)
    if (developer) {
      console.log(`[API /auth/user] Wallet: ${wallet}, adminRole: ${developer.adminRole}, isAdmin: ${isAdminUser}`);
    }

    return NextResponse.json({
      user: {
        wallet,
        name: developer?.name || null,
        avatar: developer?.avatar || null,
        bio: developer?.bio || null,
        verified: developer?.verified || false,
        isAdmin: isAdminUser, // Return admin status
        adminRole: developer?.adminRole || null, // Also return the raw role
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    // Handle database connection errors gracefully
    if (error?.code === 'P1001' || 
        error?.message?.includes("Can't reach database") ||
        error?.message?.includes("P1001") ||
        error?.message?.includes("connection") ||
        !process.env.DATABASE_URL) {
      console.error("Database connection error in /api/auth/user:", error.message);
      return NextResponse.json(
        { 
          error: "Database unavailable",
          message: process.env.DATABASE_URL 
            ? "Database connection failed. Check if Supabase project is paused or DATABASE_URL is correct."
            : "DATABASE_URL environment variable is not set."
        },
        { status: 503 }
      );
    }
    
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user", message: error.message },
      { status: 500 }
    );
  }
}

