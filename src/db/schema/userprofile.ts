import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { Developer } from "./developer";

export const UserProfile = pgTable("UserProfile", {
  id: uuid("id").primaryKey().defaultRandom(),
  wallet: text("wallet").notNull().unique(),
  developerId: uuid("developerId").notNull().unique().references(() => Developer.id, { onDelete: "cascade" }),
  bio: text("bio"),
  farcasterHandle: text("farcasterHandle"),
  farcasterFid: text("farcasterFid"),
  publicXP: boolean("publicXP").default(true).notNull(),
  favoriteApps: text("favoriteApps").array().default([]).notNull(),
  recentlyLaunched: text("recentlyLaunched").array().default([]).notNull(),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
  updatedAt: timestamp("updatedAt").default(sql`now()`).notNull(),
});

