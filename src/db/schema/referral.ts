import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const Referral = pgTable("Referral", {
  id: uuid("id").primaryKey().defaultRandom(),
  referrerFid: text("referrerFid").notNull(),
  referrerWallet: text("referrerWallet"),
  referredFid: text("referredFid"),
  referredWallet: text("referredWallet"),
  referralUrl: text("referralUrl").notNull(),
  clicked: boolean("clicked").default(false).notNull(),
  converted: boolean("converted").default(false).notNull(),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
  clickedAt: timestamp("clickedAt"),
  convertedAt: timestamp("convertedAt"),
});

