import { MiniApp, AppEvent } from "@prisma/client";

export type MiniAppWithEvents = MiniApp & { events: AppEvent[] };

export function computeTrendingScore(app: MiniAppWithEvents): number {
  const now = Date.now();
  const hours48 = 48 * 60 * 60 * 1000;
  
  const recentEvents = app.events.filter(
    (e) => now - e.createdAt.getTime() <= hours48
  );
  
  const clicks48h = recentEvents.filter((e) => e.type === "click").length;
  const installs48h = recentEvents.filter((e) => e.type === "install").length;
  const opens48h = recentEvents.filter((e) => e.type === "open").length;
  
  // shares not persisted yet -> approximate with opens
  const shares48h = opens48h;
  
  // Base engagement score
  let score =
    clicks48h * 0.5 +
    installs48h * 0.3 +
    shares48h * 0.2;
  
  // Rating boost (quality matters)
  score += app.ratingAverage * 2;
  
  // Review count boost (more reviews = more trending)
  // Apps with most reviews get priority in trending
  const reviewBoost = Math.min(app.ratingCount * 1.5, 50); // Cap at 50
  score += reviewBoost;
  
  // Recency boost
  const ageMs = now - app.createdAt.getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  if (ageMs < sevenDaysMs) score *= 1.2;
  
  return score;
}

