import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    // Fallback: check walletAddress cookie if session not found (for cases where DB is unavailable)
    let wallet: string | null = null;
    if (session?.wallet) {
      wallet = session.wallet;
    } else {
      const cookieStore = await cookies();
      const walletCookie = cookieStore.get("walletAddress")?.value;
      if (walletCookie) {
        wallet = walletCookie;
      }
    }
    
    if (!wallet) {
      return NextResponse.json(
        { error: "Unauthorized. Please connect your wallet." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = updateProfileSchema.parse(body);

    // Find or create developer
    let developer;
    try {
      developer = await prisma.developer.findUnique({
        where: { wallet: wallet.toLowerCase() },
      });

      if (!developer) {
        // Create developer if doesn't exist
        developer = await prisma.developer.create({
          data: {
            wallet: wallet.toLowerCase(),
            name: validated.name || null,
            bio: validated.bio || null,
          },
        });
      } else {
        // Update existing developer
        developer = await prisma.developer.update({
          where: { wallet: wallet.toLowerCase() },
          data: {
            ...(validated.name !== undefined && { name: validated.name || null }),
            ...(validated.bio !== undefined && { bio: validated.bio || null }),
          },
        });
      }

      return NextResponse.json({
        success: true,
        developer: {
          id: developer.id,
          wallet: developer.wallet,
          name: developer.name,
          bio: developer.bio,
          verified: developer.verified,
        },
      });
    } catch (dbError: any) {
      // Handle database connection errors gracefully
      if (dbError?.code === 'P1001' || dbError?.message?.includes("Can't reach database")) {
        return NextResponse.json(
          { 
            error: "Database temporarily unavailable. Please try again later.",
            warning: "Database unavailable"
          },
          { status: 503 } // Service Unavailable
        );
      }
      // Re-throw other database errors
      throw dbError;
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    
    // Only log if it's not a database connection error (to reduce spam)
    if (!error?.code?.includes('P1001') && !error?.message?.includes("Can't reach database")) {
      console.error("Error updating profile:", error);
    }
    
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    // Fallback: check walletAddress cookie if session not found
    let wallet: string | null = null;
    if (session?.wallet) {
      wallet = session.wallet;
    } else {
      const cookieStore = await cookies();
      const walletCookie = cookieStore.get("walletAddress")?.value;
      if (walletCookie) {
        wallet = walletCookie;
      }
    }
    
    if (!wallet) {
      return NextResponse.json(
        { error: "Unauthorized. Please connect your wallet." },
        { status: 401 }
      );
    }

    try {
      const developer = await prisma.developer.findUnique({
        where: { wallet: wallet.toLowerCase() },
        select: {
          id: true,
          wallet: true,
          name: true,
          bio: true,
          avatar: true,
          verified: true,
          verificationStatus: true,
        },
      });

      return NextResponse.json({
        developer: developer || null,
      });
    } catch (dbError: any) {
      // Handle database connection errors gracefully
      if (dbError?.code === 'P1001' || dbError?.message?.includes("Can't reach database")) {
        // Database is unavailable - return null developer instead of error
        // This allows the app to continue working without database
        return NextResponse.json({
          developer: null,
          warning: "Database temporarily unavailable",
        });
      }
      // Re-throw other database errors
      throw dbError;
    }
  } catch (error: any) {
    // Only log if it's not a database connection error (to reduce spam)
    if (!error?.code?.includes('P1001') && !error?.message?.includes("Can't reach database")) {
      console.error("Error fetching profile:", error);
    }
    
    // Return null developer on any error to allow app to continue
    return NextResponse.json({
      developer: null,
      error: "Failed to fetch profile",
    });
  }
}

