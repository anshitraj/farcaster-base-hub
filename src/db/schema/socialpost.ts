import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const SocialPost = pgTable("SocialPost", {
  id: uuid("id").primaryKey().defaultRandom(),
  castId: text("castId").unique(),
  authorName: text("authorName"),
  authorHandle: text("authorHandle"),
  authorAvatar: text("authorAvatar"),
  content: text("content").notNull(),
  mediaUrl: text("mediaUrl"),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
});

