import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const TopBaseApps = pgTable("TopBaseApps", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull().unique(),
  name: text("name").notNull(),
  icon: text("icon"),
  category: text("category"),
  score: integer("score").default(0).notNull(),
  rank: integer("rank").notNull().unique(),
  lastSynced: timestamp("lastSynced").default(sql`now()`).notNull(),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
  updatedAt: timestamp("updatedAt").default(sql`now()`).notNull(),
});

