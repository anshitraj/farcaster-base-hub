import type { NeynarFrame } from "@/lib/neynar/searchMiniApps";
import type { MiniAppCategory } from "@/types/miniapp";

/**
 * Extract raw description from frame metadata
 */
export function getRawDescription(frame: NeynarFrame): string {
  return (
    frame.manifest?.miniapp?.description ||
    frame.manifest?.frame?.description ||
    frame.manifest?.miniapp?.tagline ||
    frame.manifest?.frame?.tagline ||
    frame.manifest?.miniapp?.subtitle ||
    frame.manifest?.frame?.subtitle ||
    "A mini app built for Farcaster on the Base network."
  );
}

/**
 * Create a short description (1-2 lines, ~110 chars)
 */
export function makeShortDescription(
  raw: string,
  category: MiniAppCategory
): string {
  // Trim to ~110 characters
  let trimmed = raw.trim();
  if (trimmed.length > 110) {
    trimmed = trimmed.substring(0, 107) + "...";
  }

  // Category-specific prefixes (optional enhancement)
  const categoryPrefixes: Record<MiniAppCategory, string> = {
    game: "Casual game: ",
    music: "Music app: ",
    social: "Social platform: ",
    productivity: "Productivity tool: ",
    finance: "Onchain finance: ",
    utility: "Utility tool: ",
  };

  const prefix = categoryPrefixes[category];
  
  // Only add prefix if description doesn't already start with something similar
  if (prefix && !trimmed.toLowerCase().startsWith(category.toLowerCase().substring(0, 4))) {
    return prefix + trimmed;
  }

  return trimmed;
}

/**
 * Create SEO-friendly description (2-3 sentences, ~220 chars)
 */
export function makeSeoDescription(
  raw: string,
  category: MiniAppCategory,
  name: string
): string {
  const categoryLabels: Record<MiniAppCategory, string> = {
    game: "game",
    music: "music",
    social: "social",
    productivity: "productivity & workflow",
    finance: "DeFi and portfolio",
    utility: "utility",
  };

  const categoryBenefits: Record<MiniAppCategory, string> = {
    game: "play and compete with friends",
    music: "discover and share music",
    social: "connect and engage with your community",
    productivity: "organize tasks and boost your workflow",
    finance: "manage your portfolio and track assets",
    utility: "access powerful tools and utilities",
  };

  const categoryLabel = categoryLabels[category];
  const benefit = categoryBenefits[category];

  // Extract first sentence from raw description
  const firstSentence = raw.split(/[.!?]/)[0] || raw.substring(0, 100);
  const trimmedSentence = firstSentence.length > 100 
    ? firstSentence.substring(0, 97) + "..." 
    : firstSentence;

  return `${name} is a ${categoryLabel} mini app for Farcaster users on Base. ${trimmedSentence} Use it directly from your Mini App Store to ${benefit}.`;
}

