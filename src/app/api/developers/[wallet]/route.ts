import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = 'force-dynamic'; // Prevent caching

export async function GET(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const wallet = params.wallet.toLowerCase();

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    let developer = await prisma.developer.findUnique({
      where: { wallet },
      include: {
        apps: {
          where: {
            status: "approved", // Only show approved apps
          },
          select: {
            id: true,
            name: true,
            iconUrl: true,
            category: true,
            clicks: true,
            installs: true,
            ratingAverage: true,
            ratingCount: true,
            verified: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        badges: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      // adminRole is included by default when using include (all Developer fields are returned)
    });
    
    // Debug: Log adminRole to help troubleshoot
    if (developer) {
      console.log(`[API] Developer ${wallet} adminRole:`, developer.adminRole);
    }

    // Auto-create developer if they don't exist (for valid wallet addresses)
    if (!developer) {
      developer = await prisma.developer.create({
        data: {
          wallet,
          name: null,
          verified: false,
        },
        include: {
          apps: {
            where: {
              status: "approved",
            },
            select: {
              id: true,
              name: true,
              iconUrl: true,
              category: true,
              clicks: true,
              installs: true,
              ratingAverage: true,
              ratingCount: true,
              verified: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
          badges: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      });
    }

    // Ensure adminRole is in the response (it should be, but let's be explicit)
    const response = {
      developer: {
        ...developer,
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
    if (error?.code === 'P1001' || 
        error?.message?.includes("Can't reach database") ||
        error?.message?.includes("P1001") ||
        error?.message?.includes("connection") ||
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

