import { pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const QuestCompletion = pgTable("QuestCompletion", {
  id: uuid("id").primaryKey().defaultRandom(),
  questId: text("questId").notNull(), // e.g., "launch", "review", "save", "daily-launch", "daily-review"
  wallet: text("wallet").notNull(), // User's wallet address
  completionDate: timestamp("completionDate").default(sql`now()`).notNull(), // Date of completion (for daily quests, this is the day)
  completedAt: timestamp("completedAt").default(sql`now()`).notNull(), // Exact timestamp
}, (table) => ({
  // Unique constraint: one completion per quest per wallet per day (for daily quests)
  // For non-daily quests, we'll use the same date for all completions
  uniqueQuestWalletDate: uniqueIndex("unique_quest_wallet_date").on(
    table.questId,
    table.wallet,
    sql`DATE(${table.completionDate})`
  ),
}));

