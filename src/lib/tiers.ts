/**
 * Developer Tier System
 * Calculates developer tier based on multiple factors
 */

export type DeveloperTier = "starter" | "verified" | "pro" | "elite" | "master";

export interface TierInfo {
  tier: DeveloperTier;
  name: string;
  icon: string;
  color: string;
  score: number;
  nextTier?: DeveloperTier;
  nextTierScore?: number;
  perks: string[];
}

export const TIER_INFO: Record<DeveloperTier, TierInfo> = {
  starter: {
    tier: "starter",
    name: "Starter Developer",
    icon: "🟦",
    color: "blue",
    score: 0,
    nextTier: "verified",
    nextTierScore: 100,
    perks: [
      "Submit apps",
      "Basic analytics",
      "Earn XP",
    ],
  },
  verified: {
    tier: "verified",
    name: "Verified Developer",
    icon: "🟪",
    color: "purple",
    score: 100,
    nextTier: "pro",
    nextTierScore: 500,
    perks: [
      "All Starter perks",
      "Verified badge",
      "Priority support",
      "Enhanced analytics",
    ],
  },
  pro: {
    tier: "pro",
    name: "Pro Developer",
    icon: "🟩",
    color: "green",
    score: 500,
    nextTier: "elite",
    nextTierScore: 2000,
    perks: [
      "All Verified perks",
      "Featured placement",
      "Boost credits",
      "Advanced analytics",
    ],
  },
  elite: {
    tier: "elite",
    name: "Elite Developer",
    icon: "🟧",
    color: "orange",
    score: 2000,
    nextTier: "master",
    nextTierScore: 10000,
    perks: [
      "All Pro perks",
      "Elite badge",
      "Premium features access",
      "Custom branding",
    ],
  },
  master: {
    tier: "master",
    name: "Master Developer",
    icon: "👑",
    color: "gold",
    score: 10000,
    perks: [
      "All Elite perks",
      "Master badge",
      "Exclusive events",
      "Platform partnership",
      "Revenue sharing",
    ],
  },
};

export interface DeveloperMetrics {
  verified: boolean;
  contractVerified: boolean;
  totalXP: number;
  appsSubmitted: number;
  totalLaunches: number;
  isPremium: boolean;
}

export function calculateTierScore(metrics: DeveloperMetrics): number {
  let score = 0;

  // Verified status: +50
  if (metrics.verified) score += 50;

  // Contract verified: +100
  if (metrics.contractVerified) score += 100;

  // XP: 1 point per 10 XP
  score += Math.floor(metrics.totalXP / 10);

  // Apps submitted: +20 per app
  score += metrics.appsSubmitted * 20;

  // Total launches: +1 per 100 launches
  score += Math.floor(metrics.totalLaunches / 100);

  // Premium status: +200
  if (metrics.isPremium) score += 200;

  return score;
}

export function getTierFromScore(score: number): DeveloperTier {
  if (score >= 10000) return "master";
  if (score >= 2000) return "elite";
  if (score >= 500) return "pro";
  if (score >= 100) return "verified";
  return "starter";
}

export function getTierInfo(tier: DeveloperTier): TierInfo {
  return TIER_INFO[tier];
}

export function getNextTierInfo(currentTier: DeveloperTier): TierInfo | null {
  const current = TIER_INFO[currentTier];
  if (!current.nextTier) return null;
  return TIER_INFO[current.nextTier];
}

