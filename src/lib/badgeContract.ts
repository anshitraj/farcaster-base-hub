import { ethers } from "ethers";
import { mintSBTWithPaymaster } from "./coinbase-api";

const CONTRACT_ADDRESS = process.env.BADGE_CONTRACT_ADDRESS!;
const PRIVATE_KEY = process.env.BADGE_ADMIN_PRIVATE_KEY!;
const ALCHEMY_BASE_URL = process.env.ALCHEMY_BASE_URL || process.env.COINBASE_BASE_RPC;
const USE_COINBASE = process.env.USE_COINBASE_API === "true";

// Badge Contract ABI
const ABI = [
  "function mintBadge(address to, string uri) external",
  "function mintCastYourAppBadge(address to, uint256 appId, string memory uri) external",
  "function mintAppDeveloperBadge(address to, uint256 appId, string memory uri) external",
  "function hasBadge(string memory badgeType, uint256 appId, address wallet) external view returns (bool)",
];

export function getBadgeContract() {
  if (!CONTRACT_ADDRESS || !PRIVATE_KEY || !ALCHEMY_BASE_URL) {
    throw new Error("Badge contract configuration missing. Check env vars: BADGE_CONTRACT_ADDRESS, BADGE_ADMIN_PRIVATE_KEY, ALCHEMY_BASE_URL");
  }

  const provider = new ethers.JsonRpcProvider(ALCHEMY_BASE_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
  
  return contract;
}

export async function mintBadge(to: string, metadataUri: string) {
  try {
    // Use Coinbase Paymaster if configured, otherwise use ethers
    if (USE_COINBASE && CONTRACT_ADDRESS) {
      try {
        console.log("[Badge Contract] Using Coinbase Paymaster for gas-free minting");
        return await mintSBTWithPaymaster(to, metadataUri, CONTRACT_ADDRESS);
      } catch (coinbaseError: any) {
        console.warn("[Badge Contract] Coinbase minting failed, falling back to ethers:", coinbaseError?.message || coinbaseError);
        // Fall through to ethers
      }
    }

    // Default: use ethers
    console.log("[Badge Contract] Using ethers for minting");
    console.log("[Badge Contract] Contract address:", CONTRACT_ADDRESS);
    console.log("[Badge Contract] Minting to:", to);
    console.log("[Badge Contract] Metadata URI:", metadataUri);
    
    const contract = getBadgeContract();
    const tx = await contract.mintBadge(to, metadataUri);
    console.log("[Badge Contract] Transaction sent, waiting for confirmation...");
    console.log("[Badge Contract] Transaction hash:", tx.hash);
    
    // Wait for transaction with timeout (60 seconds)
    const timeoutMs = 60000;
    const confirmationPromise = tx.wait();
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error("Transaction confirmation timeout")), timeoutMs)
    );
    
    try {
      await Promise.race([confirmationPromise, timeoutPromise]);
      console.log("[Badge Contract] Transaction confirmed!");
      return tx.hash;
    } catch (waitError: any) {
      // If timeout, still return the tx hash since the transaction was sent
      if (waitError.message === "Transaction confirmation timeout") {
        console.warn("[Badge Contract] Transaction confirmation timed out, but transaction was sent:", tx.hash);
        return tx.hash;
      }
      throw waitError;
    }
  } catch (error: any) {
    console.error("[Badge Contract] Mint error:", error);
    console.error("[Badge Contract] Error details:", {
      message: error?.message,
      code: error?.code,
      reason: error?.reason,
      data: error?.data,
    });
    
    // Provide more helpful error messages
    if (error?.message?.includes("configuration missing")) {
      throw new Error("Badge contract not configured. Please set BADGE_CONTRACT_ADDRESS, BADGE_ADMIN_PRIVATE_KEY, and ALCHEMY_BASE_URL in environment variables.");
    }
    if (error?.code === "INSUFFICIENT_FUNDS" || error?.message?.includes("insufficient funds")) {
      throw new Error("Insufficient funds to pay for gas. Please ensure the admin wallet has enough ETH.");
    }
    if (error?.code === "CALL_EXCEPTION" || error?.message?.includes("revert")) {
      throw new Error("Contract call failed. The badge may have already been minted or the contract address is incorrect.");
    }
    
    throw error;
  }
}

/**
 * Mint "Cast Your App" badge
 */
export async function mintCastYourAppBadge(to: string, appId: string, metadataUri: string) {
  try {
    console.log("[Badge Contract] Minting Cast Your App badge");
    console.log("[Badge Contract] To:", to);
    console.log("[Badge Contract] App ID:", appId);
    console.log("[Badge Contract] Metadata URI:", metadataUri);
    
    const contract = getBadgeContract();
    const tx = await contract.mintCastYourAppBadge(to, appId, metadataUri);
    console.log("[Badge Contract] Transaction sent, waiting for confirmation...");
    await tx.wait();
    console.log("[Badge Contract] Transaction confirmed!");
    return tx.hash;
  } catch (error: any) {
    console.error("[Badge Contract] Mint Cast badge error:", error);
    throw error;
  }
}

/**
 * Mint "App Developer" badge
 */
export async function mintAppDeveloperBadge(to: string, appId: string, metadataUri: string) {
  try {
    console.log("[Badge Contract] Minting App Developer badge");
    console.log("[Badge Contract] To:", to);
    console.log("[Badge Contract] App ID:", appId);
    console.log("[Badge Contract] Metadata URI:", metadataUri);
    
    const contract = getBadgeContract();
    const tx = await contract.mintAppDeveloperBadge(to, appId, metadataUri);
    console.log("[Badge Contract] Transaction sent, waiting for confirmation...");
    await tx.wait();
    console.log("[Badge Contract] Transaction confirmed!");
    return tx.hash;
  } catch (error: any) {
    console.error("[Badge Contract] Mint Developer badge error:", error);
    throw error;
  }
}

/**
 * Try to find the transaction hash for an already-minted badge by querying Transfer events
 */
export async function findBadgeTransactionHash(
  to: string,
  appId: string,
  badgeType: "cast_your_app" | "sbt"
): Promise<string | null> {
  try {
    if (!CONTRACT_ADDRESS || !ALCHEMY_BASE_URL) {
      console.warn("[Badge Contract] Cannot query blockchain - contract not configured");
      return null;
    }

    const provider = new ethers.JsonRpcProvider(ALCHEMY_BASE_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);

    // Try to query Transfer events (standard ERC721/ERC1155 event)
    // This is a best-effort attempt - may not work if contract doesn't emit standard events
    try {
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100000); // Check last ~100k blocks (roughly 2 weeks on Base)
      
      // Query Transfer events
      const transferFilter = contract.filters.Transfer(null, to);
      const events = await contract.queryFilter(transferFilter, fromBlock, currentBlock);
      
      if (events.length > 0) {
        // Return the most recent transfer event's transaction hash
        const latestEvent = events[events.length - 1];
        console.log(`[Badge Contract] Found transaction hash from Transfer event: ${latestEvent.transactionHash}`);
        return latestEvent.transactionHash;
      }
    } catch (eventError: any) {
      console.warn("[Badge Contract] Could not query Transfer events:", eventError.message);
    }

    return null;
  } catch (error: any) {
    console.error("[Badge Contract] Error finding transaction hash:", error);
    return null;
  }
}

