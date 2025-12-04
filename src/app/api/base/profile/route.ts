import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";

export const dynamic = 'force-dynamic';

const BASE_RPC = process.env.ALCHEMY_BASE_URL || process.env.COINBASE_BASE_RPC || "https://mainnet.base.org";

// Base Name Service Registry contract (Base uses ENS-compatible system)
const BASE_REGISTRY = "0x4f3a120e72c76c22ae802d129f599bfdbc31cb81"; // Base Name Service registry
const BASE_REVERSE_REGISTRAR = "0x4f3a120e72c76c22ae802d129f599bfdbc31cb81"; // Reverse registrar

/**
 * Fetch Base profile (name and avatar) for a wallet address
 * Resolves .minicast names from developer profile
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

    const normalizedWallet = wallet.toLowerCase();

    // Try to resolve .minicast name from developer profile
    // Names are stored in the developer profile when users verify their account
    let baseName: string | null = null;
    let baseEthName: string | null = null;
    
    try {
      const { prisma } = await import("@/lib/db");
      const developer = await prisma.developer.findFirst({
        where: {
          wallet: normalizedWallet,
        },
      });
      
      if (developer?.name) {
        if (developer.name.endsWith('.minicast')) {
          baseName = developer.name;
        } else if (developer.name.endsWith('.base.eth')) {
          baseEthName = developer.name;
        }
      }
    } catch (error) {
      console.error("Error fetching developer profile:", error);
    }

    // Try to resolve .base.eth name from Base ENS (reverse lookup)
    if (!baseEthName) {
      try {
        const provider = new ethers.JsonRpcProvider(BASE_RPC);
        // Base uses ENS-compatible reverse resolution
        // Reverse lookup format: {address}.addr.reverse
        const reverseNode = `${normalizedWallet.slice(2)}.addr.reverse`;
        
        // Use the Base Name Service resolver
        // Note: This is a simplified approach - full ENS resolution would use the resolver contract
        // For now, we'll check if the developer has a .base.eth name stored
        // In production, you'd use the full ENS resolver contract to do reverse lookup
      } catch (error) {
        console.error("Error resolving Base ENS name:", error);
      }
    }

    // Use a consistent generated avatar based on wallet address
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${normalizedWallet}&backgroundColor=b6e3f4,c0aede,d1d4f9&hairColor=77311d,4a312c`;

    return NextResponse.json({
      wallet: normalizedWallet,
      name: baseName || baseEthName,
      baseEthName: baseEthName, // Separate field for .base.eth name
      avatar: avatarUrl,
      source: (baseName || baseEthName) ? "base" : "generated",
    });
  } catch (error: any) {
    console.error("Base profile fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

