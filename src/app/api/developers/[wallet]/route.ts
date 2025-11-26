import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { wallet: string } }
) {
  try {
    const wallet = params.wallet.toLowerCase();

    const developer = await prisma.developer.findUnique({
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
    });

    if (!developer) {
      return NextResponse.json(
        { error: "Developer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ developer });
  } catch (error: any) {
    // Handle database connection errors gracefully
    if (error?.code === 'P1001' || error?.message?.includes("Can't reach database")) {
      console.error("Database connection error:", error.message);
      return NextResponse.json(
        { 
          error: "Database unavailable",
          message: "Please check your database connection. Your Supabase project may be paused."
        },
        { status: 503 }
      );
    }
    
    console.error("Get developer error:", error);
    return NextResponse.json(
      { error: "Failed to fetch developer" },
      { status: 500 }
    );
  }
}

