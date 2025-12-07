import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { Developer } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    const walletLower = wallet.toLowerCase();
    // Find or create developer
    let developer;
    try {
      let developerResult = await db.select().from(Developer)
        .where(eq(Developer.wallet, walletLower))
        .limit(1);
      developer = developerResult[0];

      if (!developer) {
        // Create developer if doesn't exist
        const [newDeveloper] = await db.insert(Developer).values({
          wallet: walletLower,
          name: validated.name || null,
          bio: validated.bio || null,
        }).returning();
        developer = newDeveloper;
      } else {
        // Update existing developer
        const updateData: any = {};
        if (validated.name !== undefined) updateData.name = validated.name || null;
        if (validated.bio !== undefined) updateData.bio = validated.bio || null;
        
        const [updatedDeveloper] = await db.update(Developer)
          .set(updateData)
          .where(eq(Developer.wallet, walletLower))
          .returning();
        developer = updatedDeveloper;
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
      if (dbError?.message?.includes("connection") || dbError?.message?.includes("database")) {
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
    if (!error?.message?.includes("connection") && !error?.message?.includes("database")) {
      console.error("Error updating profile:", error);
    }
    
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}


export const runtime = "edge";
export const revalidate = 60; // Cache for 60 seconds
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

    const walletLower = wallet.toLowerCase();
    try {
      const developerResult = await db.select({
        id: Developer.id,
        wallet: Developer.wallet,
        name: Developer.name,
        bio: Developer.bio,
        avatar: Developer.avatar,
        verified: Developer.verified,
        verificationStatus: Developer.verificationStatus,
      })
        .from(Developer)
        .where(eq(Developer.wallet, walletLower))
        .limit(1);
      const developer = developerResult[0];

      return NextResponse.json({
        developer: developer || null,
      });
    } catch (dbError: any) {
      // Handle database connection errors gracefully
      if (dbError?.message?.includes("connection") || dbError?.message?.includes("database")) {
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
    if (!error?.message?.includes("connection") && !error?.message?.includes("database")) {
      console.error("Error fetching profile:", error);
    }
    
    // Return null developer on any error to allow app to continue
    return NextResponse.json({
      developer: null,
      error: "Failed to fetch profile",
    });
  }
}

