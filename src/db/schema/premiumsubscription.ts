import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const PremiumSubscription = pgTable("PremiumSubscription", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("userId").notNull(),
  wallet: text("wallet").notNull(),
  status: text("status").default("active").notNull(),
  startedAt: timestamp("startedAt").default(sql`now()`).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  renewalCount: integer("renewalCount").default(0).notNull(),
  txHash: text("txHash"),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
  updatedAt: timestamp("updatedAt").default(sql`now()`).notNull(),
});

