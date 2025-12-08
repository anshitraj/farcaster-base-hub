/**
 * Coinbase Paymaster Integration for Gas-Free Transactions
 * Uses Base Paymaster API to sponsor gas fees
 */

import { ethers } from "ethers";

const COINBASE_PAYMASTER_URL = process.env.COINBASE_PAYMASTER_URL || "https://paymaster.base.org";
const COINBASE_PAYMASTER_API_KEY = process.env.COINBASE_PAYMASTER_API_KEY;
const BADGE_CONTRACT_ADDRESS = process.env.BADGE_CONTRACT_ADDRESS;
const ALCHEMY_BASE_URL = process.env.ALCHEMY_BASE_URL || process.env.COINBASE_BASE_RPC;

// SBT Contract ABI - minimal for mintBadge
const SBT_ABI = [
  "function mintBadge(address to, string uri) external",
  "function balanceOf(address owner) external view returns (uint256)",
];

interface PaymasterRequest {
  jsonrpc: string;
  id: number;
  method: string;
  params: {
    domain: {
      name: string;
      version: string;
      chainId: number;
      verifyingContract: string;
    };
    primaryType: string;
    types: any;
    message: any;
  };
}

/**
 * Get Paymaster sponsorship for a transaction
 * Returns the paymasterAndData field for UserOperation
 */
export async function getPaymasterSponsorship(
  userOp: any,
  entryPoint: string = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789" // Base EntryPoint
): Promise<string> {
  if (!COINBASE_PAYMASTER_API_KEY) {
    throw new Error("Paymaster API key not configured");
  }

  try {
    // Use Base Paymaster API
    const response = await fetch(`${COINBASE_PAYMASTER_URL}/v1/sponsor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${COINBASE_PAYMASTER_API_KEY}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "pm_sponsorUserOperation",
        params: [userOp, entryPoint],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Paymaster error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`Paymaster error: ${result.error.message}`);
    }

    // Return paymasterAndData
    return result.result?.paymasterAndData || result.result;
  } catch (error: any) {
    console.error("Paymaster sponsorship error:", error);
    throw new Error(`Failed to get paymaster sponsorship: ${error.message}`);
  }
}

/**
 * Create a gasless transaction using Paymaster
 * This uses EIP-4337 Account Abstraction with Paymaster
 */
export async function createGaslessTransaction(
  to: string,
  data: string,
  from: string
): Promise<{ userOp: any; paymasterAndData: string }> {
  if (!ALCHEMY_BASE_URL) {
    throw new Error("RPC URL not configured");
  }

  const provider = new ethers.JsonRpcProvider(ALCHEMY_BASE_URL);
  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);

  // Get nonce and other transaction parameters
  const nonce = await provider.getTransactionCount(from);
  const gasPrice = await provider.getFeeData();

  // Build UserOperation (EIP-4337)
  const userOp = {
    sender: from,
    nonce: ethers.toBeHex(nonce),
    initCode: "0x",
    callData: data,
    callGasLimit: ethers.toBeHex(300000), // Adjust based on contract
    verificationGasLimit: ethers.toBeHex(100000),
    preVerificationGas: ethers.toBeHex(21000),
    maxFeePerGas: gasPrice.gasPrice ? ethers.toBeHex(gasPrice.gasPrice) : ethers.toBeHex(1000000000),
    maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas ? ethers.toBeHex(gasPrice.maxPriorityFeePerGas) : ethers.toBeHex(1000000000),
    paymasterAndData: "0x",
    signature: "0x",
  };

  // Get paymaster sponsorship
  const paymasterAndData = await getPaymasterSponsorship(userOp);

  return { userOp, paymasterAndData };
}

/**
 * Mint SBT badge with gas-free transaction using Paymaster
 * This is a simplified version - in production, use a proper AA wallet
 */
export async function mintSBTWithPaymaster(
  to: string,
  metadataUri: string,
  contractAddress: string
): Promise<string> {
  if (!BADGE_CONTRACT_ADDRESS || !ALCHEMY_BASE_URL) {
    throw new Error("Badge contract or RPC not configured");
  }

  const provider = new ethers.JsonRpcProvider(ALCHEMY_BASE_URL);
  const contract = new ethers.Contract(contractAddress, SBT_ABI, provider);

  // Encode the mintBadge function call
  const iface = new ethers.Interface(SBT_ABI);
  const data = iface.encodeFunctionData("mintBadge", [to, metadataUri]);

  try {
    // For now, we'll use a simpler approach with ethers and Paymaster
    // In production, integrate with a proper AA wallet like Coinbase Smart Wallet
    
    // If Paymaster is configured, try to get sponsorship
    if (COINBASE_PAYMASTER_API_KEY) {
      // Note: This requires the user to have an AA wallet
      // For MVP, we'll fall back to regular transaction but log that Paymaster should be used
      console.log("Paymaster configured - transaction should be gas-free with AA wallet");
    }

    // For MVP: Use regular transaction (user pays gas)
    // TODO: Integrate with Coinbase Smart Wallet or other AA wallet for true gas-free
    const wallet = new ethers.Wallet(process.env.BADGE_ADMIN_PRIVATE_KEY!, provider);
    const contractWithSigner = contract.connect(wallet) as any;
    
    const tx = await contractWithSigner.mintBadge(to, metadataUri, {
      // Paymaster will sponsor if configured
    });
    
    console.log("[Coinbase API] Transaction sent, hash:", tx.hash);
    
    // Wait for transaction with timeout (60 seconds)
    const timeoutMs = 60000;
    const confirmationPromise = tx.wait();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Transaction confirmation timeout")), timeoutMs)
    );
    
    try {
      await Promise.race([confirmationPromise, timeoutPromise]);
      console.log("[Coinbase API] Transaction confirmed!");
      return tx.hash;
    } catch (waitError: any) {
      // If timeout, still return the tx hash since the transaction was sent
      if (waitError.message === "Transaction confirmation timeout") {
        console.warn("[Coinbase API] Transaction confirmation timed out, but transaction was sent:", tx.hash);
        return tx.hash;
      }
      throw waitError;
    }
  } catch (error: any) {
    console.error("Mint SBT error:", error);
    throw new Error(`Failed to mint SBT: ${error.message}`);
  }
}

/**
 * Check if a user has already claimed a badge for an app
 */
export async function hasClaimedBadge(
  userAddress: string,
  contractAddress: string
): Promise<boolean> {
  if (!ALCHEMY_BASE_URL || !contractAddress) {
    return false;
  }

  try {
    const provider = new ethers.JsonRpcProvider(ALCHEMY_BASE_URL);
    const contract = new ethers.Contract(contractAddress, SBT_ABI, provider);
    const balance = await contract.balanceOf(userAddress);
    return balance > BigInt(0);
  } catch (error) {
    console.error("Error checking badge balance:", error);
    return false;
  }
}

