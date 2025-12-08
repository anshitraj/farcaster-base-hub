import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { cookies } from "next/headers";
import { ethers } from "ethers";

// Base mainnet RPC
const BASE_RPC = process.env.ALCHEMY_BASE_URL || process.env.COINBASE_BASE_RPC || "https://mainnet.base.org";

// USDC contract address on Base
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; // Base mainnet USDC

// USDC ABI (just balanceOf and decimals)
const USDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

export const dynamic = 'force-dynamic';
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getSessionFromCookies();
    
    // Fallback: check walletAddress cookie
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

    // Validate wallet address
    if (!ethers.isAddress(wallet)) {
      return NextResponse.json(
        { error: "Invalid wallet address" },
        { status: 400 }
      );
    }

    // Check if RPC URL is configured
    if (!BASE_RPC || BASE_RPC === "https://mainnet.base.org") {
      console.warn("Using public Base RPC. Consider setting ALCHEMY_BASE_URL for better performance.");
    }

    const provider = new ethers.JsonRpcProvider(BASE_RPC);
    
    // Test connection first
    try {
      await provider.getBlockNumber();
    } catch (error: any) {
      console.error("RPC connection error:", error);
      return NextResponse.json(
        { 
          error: "Failed to connect to Base network. Please check your RPC configuration.",
          details: error.message 
        },
        { status: 503 }
      );
    }
    
    // Fetch ETH balance
    let ethFormatted = "0";
    try {
      const ethBalance = await provider.getBalance(wallet);
      // ethers.formatEther handles BigInt automatically, but ensure it's a string
      ethFormatted = ethers.formatEther(ethBalance);
    } catch (error: any) {
      console.error("Error fetching ETH balance:", error);
      return NextResponse.json(
        { 
          error: "Failed to fetch ETH balance",
          details: error.message 
        },
        { status: 500 }
      );
    }

    // Fetch USDC balance
    let usdcBalance = "0";
    let usdcDecimals = 6; // USDC typically has 6 decimals
    
    try {
      const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
      const balance = await usdcContract.balanceOf(wallet);
      const decimalsResult = await usdcContract.decimals();
      // Ensure decimals is a number (not BigInt) for JSON serialization
      usdcDecimals = typeof decimalsResult === 'bigint' ? Number(decimalsResult) : Number(decimalsResult);
      // ethers.formatUnits handles BigInt automatically and returns a string
      usdcBalance = ethers.formatUnits(balance, usdcDecimals);
    } catch (error: any) {
      console.error("Error fetching USDC balance:", error);
      // If USDC fetch fails, just return 0 (not critical)
      usdcBalance = "0";
    }

    return NextResponse.json({
      wallet: wallet.toLowerCase(),
      balances: {
        eth: {
          balance: ethFormatted,
          symbol: "ETH",
          decimals: 18,
        },
        usdc: {
          balance: usdcBalance,
          symbol: "USDC",
          decimals: usdcDecimals,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching wallet balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet balance" },
      { status: 500 }
    );
  }
}

