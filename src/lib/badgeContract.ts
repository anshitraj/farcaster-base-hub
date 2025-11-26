import { ethers } from "ethers";
import { mintSBTWithCoinbase } from "./coinbase-api";

const CONTRACT_ADDRESS = process.env.BADGE_CONTRACT_ADDRESS!;
const PRIVATE_KEY = process.env.BADGE_ADMIN_PRIVATE_KEY!;
const ALCHEMY_BASE_URL = process.env.ALCHEMY_BASE_URL || process.env.COINBASE_BASE_RPC;
const USE_COINBASE = process.env.USE_COINBASE_API === "true";

// Minimal ABI just for mintBadge
const ABI = [
  "function mintBadge(address to, string uri) external",
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
  // Use Coinbase API if configured, otherwise use ethers
  if (USE_COINBASE && CONTRACT_ADDRESS) {
    try {
      return await mintSBTWithCoinbase(to, metadataUri, CONTRACT_ADDRESS);
    } catch (coinbaseError) {
      console.warn("Coinbase minting failed, falling back to ethers:", coinbaseError);
      // Fall through to ethers
    }
  }

  // Default: use ethers
  const contract = getBadgeContract();
  const tx = await contract.mintBadge(to, metadataUri);
  await tx.wait();
  return tx.hash;
}

