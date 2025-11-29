import { MiniAppCategory, MiniAppSeed } from "@/types/miniapp";
import type { NeynarFrame } from "@/lib/neynar/searchMiniApps";

/**
 * Infer category from frame metadata and content
 */
export function inferCategory(
  frame: NeynarFrame,
  fallback: MiniAppCategory
): MiniAppCategory {
  // First check manifest category
  const manifestCategory = 
    frame.manifest?.miniapp?.primary_category?.toLowerCase() ||
    frame.manifest?.frame?.primary_category?.toLowerCase();

  if (manifestCategory) {
    // Map common category strings to our categories
    if (manifestCategory.includes("game") || manifestCategory.includes("gaming")) {
      return "game";
    }
    if (manifestCategory.includes("music") || manifestCategory.includes("audio")) {
      return "music";
    }
    if (manifestCategory.includes("social") || manifestCategory.includes("chat")) {
      return "social";
    }
    if (manifestCategory.includes("productivity") || manifestCategory.includes("work")) {
      return "productivity";
    }
    if (manifestCategory.includes("finance") || manifestCategory.includes("defi") || manifestCategory.includes("financial")) {
      return "finance";
    }
    if (manifestCategory.includes("utility") || manifestCategory.includes("tool")) {
      return "utility";
    }
  }

  // Extract text content for keyword matching
  const title = (frame.title || frame.manifest?.miniapp?.name || frame.manifest?.frame?.name || "").toLowerCase();
  const description = (
    frame.manifest?.miniapp?.description ||
    frame.manifest?.frame?.description ||
    frame.manifest?.miniapp?.tagline ||
    frame.manifest?.frame?.tagline ||
    ""
  ).toLowerCase();
  
  const tags = [
    ...(frame.manifest?.miniapp?.tags || []),
    ...(frame.manifest?.frame?.tags || []),
  ].map(t => t.toLowerCase());
  
  const allText = `${title} ${description} ${tags.join(" ")}`.toLowerCase();

  // Priority rules (stronger matches override)
  if (
    allText.includes("game") ||
    allText.includes("play") ||
    allText.includes("tap") ||
    allText.includes("runner") ||
    allText.includes("quest") ||
    allText.includes("battle") ||
    allText.includes("puzzle") ||
    allText.includes("gaming")
  ) {
    return "game";
  }

  if (
    allText.includes("music") ||
    allText.includes("song") ||
    allText.includes("playlist") ||
    allText.includes("dj") ||
    allText.includes("audio") ||
    allText.includes("beats") ||
    allText.includes("radio") ||
    allText.includes("sound")
  ) {
    return "music";
  }

  if (
    allText.includes("social") ||
    allText.includes("chat") ||
    allText.includes("friends") ||
    allText.includes("profile") ||
    allText.includes("feed") ||
    allText.includes("community") ||
    allText.includes("network")
  ) {
    return "social";
  }

  if (
    allText.includes("task") ||
    allText.includes("notes") ||
    allText.includes("todo") ||
    allText.includes("productivity") ||
    allText.includes("calendar") ||
    allText.includes("focus") ||
    allText.includes("workspace") ||
    allText.includes("organize")
  ) {
    return "productivity";
  }

  if (
    allText.includes("swap") ||
    allText.includes("dex") ||
    allText.includes("trade") ||
    allText.includes("portfolio") ||
    allText.includes("wallet") ||
    allText.includes("token") ||
    allText.includes("price") ||
    allText.includes("yield") ||
    allText.includes("vault") ||
    allText.includes("staking") ||
    allText.includes("finance") ||
    allText.includes("defi") ||
    allText.includes("crypto") ||
    allText.includes("ethereum")
  ) {
    return "finance";
  }

  if (
    allText.includes("tool") ||
    allText.includes("utility") ||
    allText.includes("helper") ||
    allText.includes("analytics") ||
    allText.includes("alerts") ||
    allText.includes("bot") ||
    allText.includes("monitor") ||
    allText.includes("tracker")
  ) {
    return "utility";
  }

  // Fallback to provided category
  return fallback;
}

/**
 * Build tags array from frame metadata
 */
export function buildTags(
  frame: NeynarFrame,
  baseCategory: MiniAppCategory
): string[] {
  const tags = new Set<string>();

  // Add manifest tags
  const manifestTags = [
    ...(frame.manifest?.miniapp?.tags || []),
    ...(frame.manifest?.frame?.tags || []),
  ];
  manifestTags.forEach(tag => {
    if (tag && typeof tag === "string") {
      tags.add(tag.toLowerCase().trim());
    }
  });

  // Add category
  tags.add(baseCategory.toLowerCase());

  // Add network tags (assuming base since we filter by it)
  tags.add("base");

  // Add derived tags from description
  const description = (
    frame.manifest?.miniapp?.description ||
    frame.manifest?.frame?.description ||
    ""
  ).toLowerCase();

  if (description.includes("onchain") || description.includes("on-chain")) {
    tags.add("onchain");
  }
  
  if (description.includes("token") || description.includes("nft")) {
    tags.add("onchain");
  }

  if (description.includes("airdrop") || description.includes("air drop")) {
    tags.add("airdrops");
  }

  if (description.includes("leaderboard") || description.includes("leader board")) {
    tags.add("leaderboard");
  }

  if (description.includes("realtime") || description.includes("real-time") || description.includes("live")) {
    tags.add("realtime");
  }

  // Limit to 12 tags
  return Array.from(tags).slice(0, 12);
}

