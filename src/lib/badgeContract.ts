import { ethers } from "ethers";
import { mintSBTWithPaymaster } from "./coinbase-api";

const CONTRACT_ADDRESS = process.env.BADGE_CONTRACT || process.env.BADGE_CONTRACT_ADDRESS!;
const PRIVATE_KEY = process.env.BADGE_ADMIN_PRIVATE_KEY!;
const ALCHEMY_BASE_URL = process.env.ALCHEMY_BASE_URL || process.env.COINBASE_BASE_RPC;
const USE_COINBASE = process.env.USE_COINBASE_API === "true";

// MiniCastBadgeSBT Contract ABI - Updated with all functions
const ABI = [
  "function mintBadge(address to, uint256 appId) external returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokensOf(address wallet) external view returns (uint256[])",
  "function hasClaimed(address wallet, uint256 appId) external view returns (bool)",
  "function badgeApp(uint256 tokenId) external view returns (uint256)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function baseBadgeURI() external view returns (string)",
  "function resetClaim(address wallet, uint256 appId) external",
  "function batchResetClaims(address[] calldata wallets, uint256[] calldata appIds) external",
  "function ownsTokenForApp(address wallet, uint256 appId) external view returns (bool)",
  "function totalSupply() external view returns (uint256)",
  "function setBaseURI(string memory _newBaseURI) external",
  "function transferOwnership(address newOwner) external",
  "event BadgeMinted(address indexed to, uint256 indexed tokenId, uint256 indexed appId)",
  "event ClaimReset(address indexed wallet, uint256 indexed appId)",
];

export function getBadgeContract() {
  if (!CONTRACT_ADDRESS || !PRIVATE_KEY || !ALCHEMY_BASE_URL) {
    throw new Error("Badge contract configuration missing. Check env vars: BADGE_CONTRACT (or BADGE_CONTRACT_ADDRESS), BADGE_ADMIN_PRIVATE_KEY, ALCHEMY_BASE_URL");
  }

  const provider = new ethers.JsonRpcProvider(ALCHEMY_BASE_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
  
  return contract;
}

/**
 * Mint badge using new MiniCastBadgeSBT contract
 * @param to - Address to mint badge to
 * @param appId - App ID (uint256) - pass as string, will be converted
 * @returns Transaction hash
 */
export async function mintBadge(to: string, appId: string | number) {
  try {
    // Convert appId to BigInt/uint256
    const appIdBigInt = typeof appId === "string" ? BigInt(appId) : BigInt(appId);

    // Use Coinbase Paymaster if configured, otherwise use ethers
    if (USE_COINBASE && CONTRACT_ADDRESS) {
      try {
        console.log("[Badge Contract] Using Coinbase Paymaster for gas-free minting");
        const txHash = await mintSBTWithPaymaster(to, appIdBigInt.toString(), CONTRACT_ADDRESS);
        console.log("[Badge Contract] Paymaster transaction hash:", txHash);
        return txHash;
      } catch (coinbaseError: any) {
        console.warn("[Badge Contract] Coinbase Paymaster minting failed, falling back to ethers:", coinbaseError?.message || coinbaseError);
        // Fall through to ethers
      }
    }

    // Default: use ethers (admin wallet pays gas)
    console.log("[Badge Contract] Using ethers for minting (admin wallet pays gas)");
    console.log("[Badge Contract] Contract address:", CONTRACT_ADDRESS);
    console.log("[Badge Contract] Minting to:", to);
    console.log("[Badge Contract] App ID:", appIdBigInt.toString());
    
    const contract = getBadgeContract();
    const tx = await contract.mintBadge(to, appIdBigInt);
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
      throw new Error("Badge contract not configured. Please set BADGE_CONTRACT (or BADGE_CONTRACT_ADDRESS), BADGE_ADMIN_PRIVATE_KEY, and ALCHEMY_BASE_URL in environment variables.");
    }
    if (error?.code === "INSUFFICIENT_FUNDS" || error?.message?.includes("insufficient funds")) {
      throw new Error("Insufficient funds to pay for gas. Please ensure the admin wallet has enough ETH.");
    }
    if (error?.code === "CALL_EXCEPTION" || error?.message?.includes("revert")) {
      if (error?.message?.includes("Badge already claimed")) {
        throw new Error("Badge already claimed for this app. Each user can only claim one badge per app.");
      }
      throw new Error("Contract call failed. The badge may have already been minted or the contract address is incorrect.");
    }
    
    throw error;
  }
}

/**
 * @deprecated Use mintBadge(to, appId) instead - new contract uses single mintBadge function
 * These functions are kept for backward compatibility but will use the new contract
 */
export async function mintCastYourAppBadge(to: string, appId: string | number, metadataUri?: string) {
  // Convert appId to BigInt if it's a string
  const appIdBigInt = typeof appId === "string" ? BigInt(appId) : BigInt(appId);
  // Use the new simple mintBadge function (metadataUri is ignored - contract uses fixed IPFS URL)
  return await mintBadge(to, appIdBigInt.toString());
}

/**
 * @deprecated Use mintBadge(to, appId) instead - new contract uses single mintBadge function
 * These functions are kept for backward compatibility but will use the new contract
 */
export async function mintAppDeveloperBadge(to: string, appId: string | number, metadataUri?: string) {
  // Convert appId to BigInt if it's a string
  const appIdBigInt = typeof appId === "string" ? BigInt(appId) : BigInt(appId);
  // Use the new simple mintBadge function (metadataUri is ignored - contract uses fixed IPFS URL)
  return await mintBadge(to, appIdBigInt.toString());
}

/**
 * Check if a badge has already been claimed on-chain
 * Uses the new ownsTokenForApp() function which is more reliable
 */
export async function hasClaimedBadge(wallet: string, appId: string | number): Promise<boolean> {
  try {
    if (!CONTRACT_ADDRESS || !ALCHEMY_BASE_URL) {
      console.warn("[Badge Contract] Cannot check on-chain - contract not configured");
      return false;
    }

    const provider = new ethers.JsonRpcProvider(ALCHEMY_BASE_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    // Convert appId to BigInt
    const appIdBigInt = typeof appId === "string" ? BigInt(appId) : BigInt(appId);
    
    // FIRST: Try using the new ownsTokenForApp() function (most reliable)
    try {
      const ownsToken = await contract.ownsTokenForApp(wallet, appIdBigInt);
      if (ownsToken) {
        console.log(`[Badge Contract] ownsTokenForApp(${wallet}, ${appIdBigInt.toString()}): true`);
        return true;
      }
    } catch (ownsTokenError: any) {
      // Function might not exist on old contracts, fall back to manual check
      console.warn("[Badge Contract] ownsTokenForApp() not available, using fallback method");
    }
    
    // FALLBACK: Check if user actually owns a token for this appId manually
    try {
      const tokenIds = await getTokensOf(wallet);
      for (const tokenId of tokenIds) {
        try {
          const tokenAppId = await getBadgeApp(tokenId);
          if (tokenAppId && tokenAppId.toString() === appIdBigInt.toString()) {
            console.log(`[Badge Contract] User owns token ${tokenId.toString()} for appId ${appIdBigInt.toString()}`);
            return true;
          }
        } catch (checkError) {
          // Continue checking other tokens
          continue;
        }
      }
    } catch (tokenError: any) {
      console.warn("[Badge Contract] Error checking token ownership:", tokenError.message);
    }
    
    // LAST RESORT: Check the hasClaimed mapping (but don't trust it if user doesn't own token)
    try {
      const claimed = await contract.hasClaimed(wallet, appIdBigInt);
      console.log(`[Badge Contract] hasClaimed(${wallet}, ${appIdBigInt.toString()}): ${claimed}`);
      
      // Only trust hasClaimed if it says false (user hasn't claimed)
      // If it says true but user doesn't own token, it's corrupted state
      return claimed;
    } catch (error: any) {
      console.error("[Badge Contract] Error checking hasClaimed:", error);
      return false;
    }
  } catch (error: any) {
    console.error("[Badge Contract] Error checking hasClaimed:", error);
    return false;
  }
}

/**
 * Check if wallet owns a token for a specific appId (uses new contract function)
 */
export async function ownsTokenForApp(wallet: string, appId: string | number): Promise<boolean> {
  try {
    if (!CONTRACT_ADDRESS || !ALCHEMY_BASE_URL) {
      return false;
    }

    const provider = new ethers.JsonRpcProvider(ALCHEMY_BASE_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    const appIdBigInt = typeof appId === "string" ? BigInt(appId) : BigInt(appId);
    
    try {
      const owns = await contract.ownsTokenForApp(wallet, appIdBigInt);
      return owns;
    } catch (error: any) {
      // Function might not exist on old contracts
      console.warn("[Badge Contract] ownsTokenForApp() not available, using fallback");
      return false;
    }
  } catch (error: any) {
    console.error("[Badge Contract] Error checking ownsTokenForApp:", error);
    return false;
  }
}

/**
 * Get all token IDs owned by a wallet
 * Uses contract's custom tokensOf() mapping, with fallback to Transfer events
 */
export async function getTokensOf(wallet: string): Promise<bigint[]> {
  try {
    if (!CONTRACT_ADDRESS || !ALCHEMY_BASE_URL) {
      console.warn("[Badge Contract] Cannot query tokens - contract not configured");
      return [];
    }

    const provider = new ethers.JsonRpcProvider(ALCHEMY_BASE_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    // First try: Use contract's custom tokensOf() mapping (most efficient)
    try {
      const tokenIds = await contract.tokensOf(wallet);
      const result = tokenIds.map((id: bigint) => BigInt(id));
      console.log(`[Badge Contract] Found ${result.length} tokens via tokensOf() for ${wallet}`);
      return result;
    } catch (tokensOfError: any) {
      // If tokensOf() fails, try to get tokens from Transfer events (ERC721 standard)
      console.warn("[Badge Contract] tokensOf() failed, trying Transfer events:", tokensOfError.message);
      
      try {
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 500000); // Check last 500k blocks
        
        // Query Transfer events to this wallet (ERC721 standard event)
        // Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
        const transferFilter = contract.filters.Transfer(null, wallet);
        const events = await contract.queryFilter(transferFilter, fromBlock, currentBlock);
        
        // Extract unique token IDs from Transfer events
        // ERC721 Transfer event signature: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
        const tokenIds = new Set<bigint>();
        for (const event of events) {
          if ('args' in event && event.args) {
            // ERC721 Transfer: args[0] = from, args[1] = to, args[2] = tokenId
            const tokenId = event.args[2] || event.args[1];
            if (tokenId) {
              tokenIds.add(BigInt(tokenId));
            }
          }
        }
        
        console.log(`[Badge Contract] Found ${tokenIds.size} tokens from Transfer events`);
        return Array.from(tokenIds);
      } catch (eventError: any) {
        console.error("[Badge Contract] Error getting tokens from events:", eventError);
        return [];
      }
    }
  } catch (error: any) {
    console.error("[Badge Contract] Error getting tokens:", error);
    return [];
  }
}

/**
 * Get the app ID for a token
 */
export async function getBadgeApp(tokenId: bigint): Promise<bigint | null> {
  try {
    if (!CONTRACT_ADDRESS || !ALCHEMY_BASE_URL) {
      return null;
    }

    const provider = new ethers.JsonRpcProvider(ALCHEMY_BASE_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
    
    const appId = await contract.badgeApp(tokenId);
    return BigInt(appId);
  } catch (error: any) {
    console.error("[Badge Contract] Error getting badge app:", error);
    return null;
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
      // Search further back - up to 500k blocks (roughly 2-3 months on Base)
      const fromBlock = Math.max(0, currentBlock - 500000);
      
      console.log(`[Badge Contract] Searching for Transfer events from block ${fromBlock} to ${currentBlock}`);
      
      // Query Transfer events to this address
      const transferFilter = contract.filters.Transfer(null, to);
      const events = await contract.queryFilter(transferFilter, fromBlock, currentBlock);
      
      console.log(`[Badge Contract] Found ${events.length} Transfer events to ${to}`);
      
      if (events.length > 0) {
        // If we have the appId, try to match it by checking the token's appId
        // Otherwise, just return the most recent one
        if (appId) {
          const appIdBigInt = typeof appId === "string" ? BigInt(appId) : BigInt(appId);
          
          // Check events in reverse order (most recent first)
          // ERC721 Transfer event: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
          for (let i = events.length - 1; i >= 0; i--) {
            const event = events[i];
            try {
              // Get the tokenId from the event - ERC721 Transfer has tokenId at args[2]
              if ('args' in event && event.args && event.args.length >= 3) {
                const tokenId = event.args[2]; // tokenId is the third parameter in ERC721 Transfer
                if (tokenId) {
                  const tokenAppId = await getBadgeApp(BigInt(tokenId));
                  if (tokenAppId && tokenAppId.toString() === appIdBigInt.toString()) {
                    console.log(`[Badge Contract] Found matching transaction hash: ${event.transactionHash}`);
                    return event.transactionHash;
                  }
                }
              }
            } catch (checkError) {
              // Continue to next event if this one fails
              continue;
            }
          }
        }
        
        // If no match found or no appId provided, return the most recent transfer
        const latestEvent = events[events.length - 1];
        console.log(`[Badge Contract] Returning most recent Transfer event transaction hash: ${latestEvent.transactionHash}`);
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

