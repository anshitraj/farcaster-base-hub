import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Developer, MiniApp, Badge } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

export const runtime = "edge";
export const revalidate = 60; // Cache for 60 seconds

export async function GET(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const wallet = params.wallet.toLowerCase();

    // Validate wallet address format (allow Ethereum addresses or Farcaster format)
    const isEthereumAddress = /^0x[a-fA-F0-9]{40}$/.test(wallet);
    const isFarcasterWallet = /^farcaster:\d+$/.test(wallet);
    
    if (!isEthereumAddress && !isFarcasterWallet) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    let developerResult = await db.select().from(Developer).where(eq(Developer.wallet, wallet)).limit(1);
    let developer = developerResult[0];
    
    // Debug: Log adminRole to help troubleshoot
    if (developer) {
      console.log(`[API] Developer ${wallet} adminRole:`, developer.adminRole);
    }

    // Auto-create developer if they don't exist (for valid wallet addresses)
    if (!developer) {
      const [newDeveloper] = await db.insert(Developer).values({
        wallet,
        name: null,
        verified: false,
      }).returning();
      developer = newDeveloper;
    }

    // Fetch related apps and badges
    const apps = await db.select({
      id: MiniApp.id,
      name: MiniApp.name,
      iconUrl: MiniApp.iconUrl,
      category: MiniApp.category,
      clicks: MiniApp.clicks,
      installs: MiniApp.installs,
      ratingAverage: MiniApp.ratingAverage,
      ratingCount: MiniApp.ratingCount,
      verified: MiniApp.verified,
      createdAt: MiniApp.createdAt,
    })
      .from(MiniApp)
      .where(and(
        eq(MiniApp.developerId, developer.id),
        eq(MiniApp.status, "approved")
      ))
      .orderBy(desc(MiniApp.createdAt));

    // Select only columns that exist in the database (badgeType may not exist yet)
    const badges = await db.select({
      id: Badge.id,
      name: Badge.name,
      imageUrl: Badge.imageUrl,
      appName: Badge.appName,
      appId: Badge.appId,
      developerId: Badge.developerId,
      txHash: Badge.txHash,
      claimed: Badge.claimed,
      metadataUri: Badge.metadataUri,
      tokenId: Badge.tokenId,
      createdAt: Badge.createdAt,
      claimedAt: Badge.claimedAt,
      // badgeType is optional - only include if column exists in DB
      // badgeType: Badge.badgeType,
    })
      .from(Badge)
      .where(eq(Badge.developerId, developer.id))
      .orderBy(desc(Badge.createdAt));

    // Ensure adminRole is in the response (it should be, but let's be explicit)
    const response = {
      developer: {
        ...developer,
        apps,
        badges,
        adminRole: developer?.adminRole || null, // Explicitly include adminRole
      }
    };
    
    // Return with no-cache headers to ensure fresh data
    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: any) {
    // Handle database connection errors gracefully
    if (error?.message?.includes("connection") ||
        error?.message?.includes("database") ||
        !process.env.DATABASE_URL) {
      console.error("Database connection error:", error.message);
      console.error("DATABASE_URL present:", !!process.env.DATABASE_URL);
      return NextResponse.json(
        { 
          error: "Database unavailable",
          message: process.env.DATABASE_URL 
            ? "Database connection failed. Check if Supabase project is paused or DATABASE_URL is correct."
            : "DATABASE_URL environment variable is not set. Please configure it in Vercel."
        },
        { status: 503 }
      );
    }
    
    console.error("Get developer error:", error);
    return NextResponse.json(
      { error: "Failed to fetch developer", message: error.message },
      { status: 500 }
    );
  }
}

