import { NextResponse } from "next/server";
import { ethers } from "ethers";

const BASE_RPC = process.env.ALCHEMY_BASE_URL || process.env.COINBASE_BASE_RPC || "https://mainnet.base.org";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || ""; // Optional: Add your BaseScan API key for better rate limits

export const dynamic = 'force-dynamic';
export const revalidate = 30; // Cache for 30 seconds

export async function GET() {
  try {
    let gasPriceGwei: number | null = null;

    // Method 1: Use RPC directly (most reliable for Base)
    if (!BASE_RPC) {
      console.error("BASE_RPC not configured");
      return NextResponse.json(
        { error: "RPC endpoint not configured", gasPriceGwei: null },
        { status: 500 }
      );
    }

    try {
      console.log("Fetching gas price from RPC:", BASE_RPC.replace(/\/v2\/[^\/]+$/, "/***"));
      const provider = new ethers.JsonRpcProvider(BASE_RPC);
      
      // Try direct RPC call first (most reliable)
      try {
        const gasPrice = await provider.send("eth_gasPrice", []);
        if (gasPrice) {
          gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, "gwei"));
          console.log("Gas price from eth_gasPrice:", gasPriceGwei);
        }
      } catch (rpcError: any) {
        console.error("Error with eth_gasPrice:", rpcError.message || rpcError);
      }

      // Fallback to getFeeData if direct call fails
      if (!gasPriceGwei || gasPriceGwei === 0) {
        try {
          const feeData = await provider.getFeeData();
          console.log("FeeData:", feeData);
          
          if (feeData.gasPrice) {
            gasPriceGwei = parseFloat(ethers.formatUnits(feeData.gasPrice, "gwei"));
            console.log("Gas price from getFeeData.gasPrice:", gasPriceGwei);
          } else if (feeData.maxFeePerGas) {
            gasPriceGwei = parseFloat(ethers.formatUnits(feeData.maxFeePerGas, "gwei"));
            console.log("Gas price from getFeeData.maxFeePerGas:", gasPriceGwei);
          }
        } catch (feeError: any) {
          console.error("Error with getFeeData:", feeError.message || feeError);
        }
      }
    } catch (rpcError: any) {
      console.error("RPC provider error:", rpcError.message || rpcError);
    }

    if (!gasPriceGwei || gasPriceGwei === 0) {
      console.error("Failed to fetch gas price - all methods failed");
      return NextResponse.json(
        { error: "Failed to fetch gas price", gasPriceGwei: null },
        { status: 500 }
      );
    }

    // Base mainnet often has very low gas prices (< 0.01 gwei)
    // Return the actual value even if it's very small
    return NextResponse.json({
      gasPriceGwei: gasPriceGwei, // Return actual value, don't round to 0
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error fetching gas price:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch gas price", 
        gasPriceGwei: null,
        message: error?.message || "Unknown error"
      },
      { status: 500 }
    );
  }
}

