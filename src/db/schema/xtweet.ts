import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const XTweet = pgTable("XTweet", {
  id: uuid("id").primaryKey().defaultRandom(),
  tweetId: text("tweetId").notNull().unique(),
  authorName: text("authorName"),
  authorHandle: text("authorHandle"),
  authorAvatar: text("authorAvatar"),
  content: text("content").notNull(),
  mediaUrl: text("mediaUrl"),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
});

