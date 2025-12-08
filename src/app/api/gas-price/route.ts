import { NextResponse } from "next/server";
import { ethers } from "ethers";

const BASE_RPC = process.env.ALCHEMY_BASE_URL || process.env.COINBASE_BASE_RPC || "https://mainnet.base.org";
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY || ""; // Optional: Add your BaseScan API key for better rate limits

export const dynamic = 'force-dynamic';
export const revalidate = 30; // Cache for 30 seconds
export const runtime = "edge";

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
      const provider = new ethers.JsonRpcProvider(BASE_RPC, undefined, {
        staticNetwork: true,
      });
      
      // Add timeout wrapper for RPC calls
      const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
        let timeoutId: ReturnType<typeof setTimeout>;
        const timeoutPromise = new Promise<T>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
        });
        
        try {
          const result = await Promise.race([promise, timeoutPromise]);
          clearTimeout(timeoutId!);
          return result;
        } catch (error) {
          clearTimeout(timeoutId!);
          throw error;
        }
      };
      
      // Try direct RPC call first (most reliable) with 10s timeout
      try {
        const gasPrice = await withTimeout(provider.send("eth_gasPrice", []), 10000);
        if (gasPrice) {
          gasPriceGwei = parseFloat(ethers.formatUnits(gasPrice, "gwei"));
          console.log("Gas price from eth_gasPrice:", gasPriceGwei);
        }
      } catch (rpcError: any) {
        console.error("Error with eth_gasPrice:", rpcError.message || rpcError);
      }

      // Fallback to getFeeData if direct call fails with 10s timeout
      if (!gasPriceGwei || gasPriceGwei === 0) {
        try {
          const feeData = await withTimeout(provider.getFeeData(), 10000);
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

    // Fetch ETH price in USD from CoinGecko
    let ethPriceUSD = 0;
    try {
      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const ethPriceRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd", {
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (ethPriceRes.ok) {
        const ethPriceData = await ethPriceRes.json();
        ethPriceUSD = ethPriceData.ethereum?.usd || 0;
        console.log("ETH price fetched:", ethPriceUSD);
      } else {
        console.error("CoinGecko API error:", ethPriceRes.status, ethPriceRes.statusText);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error("ETH price fetch timeout");
      } else {
        console.error("Error fetching ETH price:", error.message || error);
      }
      // Use a fallback ETH price if API fails (approximate current price)
      ethPriceUSD = 3000; // Fallback to ~$3000 if API fails
    }

    // Calculate gas price in USD
    // Formula: (gasPriceGwei / 1e9) * ethPriceUSD
    // For a standard transaction (21000 gas), multiply by 21000
    const gasPriceInETH = gasPriceGwei / 1e9;
    const standardTxGas = 21000; // Standard ETH transfer uses ~21000 gas
    const gasPriceUSD = gasPriceInETH * ethPriceUSD * standardTxGas;

    // Base mainnet often has very low gas prices (< 0.01 gwei)
    // Return the actual value even if it's very small
    return NextResponse.json({
      gasPriceGwei: gasPriceGwei, // Return actual value, don't round to 0
      gasPriceUSD: gasPriceUSD, // Gas price in USD for a standard transaction
      ethPriceUSD: ethPriceUSD,
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

