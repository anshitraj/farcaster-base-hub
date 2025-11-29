import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

/**
 * Fetch Base profile photo/avatar for a wallet address
 * Base doesn't have a public profile API yet, so we'll use a consistent generated avatar
 * In the future, this could integrate with Base's profile service when available
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get("wallet");

    if (!wallet || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // For now, Base doesn't have a public profile API
    // Use a consistent generated avatar based on wallet address
    // This ensures the same wallet always gets the same avatar
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${wallet}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`;

    // In the future, you could:
    // 1. Check if Base has a profile API and fetch from there
    // 2. Check if user has uploaded a custom avatar in your database
    // 3. Use ENS avatar if available
    // 4. Fall back to generated avatar

    return NextResponse.json({
      wallet: wallet.toLowerCase(),
      avatar: avatarUrl,
      source: "generated", // "base", "custom", "ens", "generated"
    });
  } catch (error: any) {
    console.error("Base profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

