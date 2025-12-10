import { db } from "@/lib/db";
import { QuestCompletion, UserPoints, PointsTransaction } from "@/db/schema";
import { eq, and, sql, gte, inArray } from "drizzle-orm";

// Re-export rank utilities for backward compatibility
// Note: Client components should import directly from "@/lib/rank-utils" to avoid importing database code
export { getRankFromLevel, getRankColor } from "@/lib/rank-utils";

// Quest point rewards
const QUEST_POINTS: Record<string, number> = {
  "launch": 10,
  "review": 10,
  "save": 5,
  "daily-launch": 10,
  "daily-review": 10,
  "launch-multiple": 50,
  "rate-multiple": 100,
  "submit": 1000,
};

/**
 * Award points for quest completion
 */
async function awardQuestPoints(wallet: string, questId: string, points: number) {
  try {
    const walletLower = wallet.toLowerCase();
    
    // Find or create user points record
    let userPointsResult = await db.select().from(UserPoints)
      .where(eq(UserPoints.wallet, walletLower))
      .limit(1);
    let userPoints = userPointsResult[0];

    if (!userPoints) {
      const [newPoints] = await db.insert(UserPoints).values({
        wallet: walletLower,
        totalPoints: points,
      }).returning();
      userPoints = newPoints;
    } else {
      const [updatedPoints] = await db.update(UserPoints)
        .set({
          totalPoints: userPoints.totalPoints + points,
        })
        .where(eq(UserPoints.wallet, walletLower))
        .returning();
      userPoints = updatedPoints;
    }

    // Create transaction record
    await db.insert(PointsTransaction).values({
      wallet: walletLower,
      points: points,
      type: "quest",
      description: `Earned ${points} points for completing quest: ${questId}`,
      referenceId: questId,
    });

    return true;
  } catch (error) {
    console.error(`Error awarding quest points for ${questId}:`, error);
    return false;
  }
}

/**
 * Calculate the current streak for a user based on daily quest completions
 * A streak is the number of consecutive days (including today) where the user completed at least one daily quest
 * @param wallet User's wallet address
 * @returns Promise<number> - The current streak in days
 */
export async function calculateStreak(wallet: string): Promise<number> {
  try {
    const walletLower = wallet.toLowerCase();
    
    // Get all daily quest completions for this user, ordered by date descending
    const dailyQuestIds = ["daily-launch", "daily-review"];
    
    // Get all daily quest completions
    const completions = await db
      .select({
        completionDate: QuestCompletion.completionDate,
      })
      .from(QuestCompletion)
      .where(
        and(
          eq(QuestCompletion.wallet, walletLower),
          inArray(QuestCompletion.questId, dailyQuestIds)
        )
      )
      .orderBy(sql`DATE(${QuestCompletion.completionDate}) DESC`);
    
    if (completions.length === 0) {
      return 0;
    }
    
    // Get unique dates (in case user completed multiple daily quests on the same day)
    const uniqueDates = new Set<string>();
    completions.forEach(completion => {
      const date = new Date(completion.completionDate);
      date.setUTCHours(0, 0, 0, 0);
      uniqueDates.add(date.toISOString().split('T')[0]);
    });
    
    // Sort dates in descending order
    const sortedDates = Array.from(uniqueDates).sort((a, b) => b.localeCompare(a));
    
    if (sortedDates.length === 0) {
      return 0;
    }
    
    // Calculate streak by checking consecutive days
    // A streak only counts if the user completed a quest today
    let streak = 0;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Check if user completed a quest today
    if (sortedDates[0] === todayStr) {
      streak = 1;
      
      // Count consecutive days going backwards from today
      for (let i = 1; i < sortedDates.length; i++) {
        const currentDate = new Date(sortedDates[i - 1] + 'T00:00:00Z');
        const previousDate = new Date(sortedDates[i] + 'T00:00:00Z');
        
        // Calculate difference in days
        const diffTime = currentDate.getTime() - previousDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          streak++;
        } else {
          break; // Streak broken - gap in days
        }
      }
    }
    // If user didn't complete a quest today, streak is 0 (broken)
    
    return streak;
  } catch (error) {
    console.error(`Error calculating streak for ${wallet}:`, error);
    return 0;
  }
}

/**
 * Track quest completion for a user
 * @param wallet User's wallet address
 * @param questId Quest identifier (e.g., "launch", "review", "daily-launch")
 * @returns Promise<boolean> - true if quest was newly completed, false if already completed
 */
export async function trackQuestCompletion(
  wallet: string,
  questId: string
): Promise<boolean> {
  try {
    const walletLower = wallet.toLowerCase();
    
    // Get today's date (start of day in UTC)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    
    // Check if quest is already completed today (for daily quests) or ever (for non-daily)
    const isDaily = questId.startsWith("daily-");
    
    let existingCompletion;
    if (isDaily) {
      // For daily quests, check if completed today
      const todayStartISO = today.toISOString();
      existingCompletion = await db
        .select()
        .from(QuestCompletion)
        .where(
          and(
            eq(QuestCompletion.questId, questId),
            eq(QuestCompletion.wallet, walletLower),
            sql`DATE(${QuestCompletion.completionDate}) = DATE(${sql.raw(`'${todayStartISO}'`)}::timestamp)`
          )
        )
        .limit(1);
    } else {
      // For non-daily quests, check if completed at all
      existingCompletion = await db
        .select()
        .from(QuestCompletion)
        .where(
          and(
            eq(QuestCompletion.questId, questId),
            eq(QuestCompletion.wallet, walletLower)
          )
        )
        .limit(1);
    }
    
    // If already completed, return false
    if (existingCompletion.length > 0) {
      return false;
    }
    
    // Insert new completion
    await db.insert(QuestCompletion).values({
      questId,
      wallet: walletLower,
      completionDate: today,
      completedAt: new Date(),
    });
    
    // Award points for quest completion
    const points = QUEST_POINTS[questId] || 0;
    if (points > 0) {
      await awardQuestPoints(wallet, questId, points);
    }
    
    return true;
  } catch (error) {
    console.error(`Error tracking quest completion for ${questId}:`, error);
    return false;
  }
}

