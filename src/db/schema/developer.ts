import { pgTable, text, boolean, integer, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const adminRoleEnum = pgEnum("AdminRole", ["ADMIN", "MODERATOR"]);

export const Developer = pgTable("Developer", {
  id: uuid("id").primaryKey().defaultRandom(),
  wallet: text("wallet").notNull().unique(),
  name: text("name"),
  avatar: text("avatar"),
  bio: text("bio"),
  verified: boolean("verified").default(false).notNull(),
  verificationStatus: text("verificationStatus").default("unverified").notNull(),
  verificationNonce: text("verificationNonce"),
  verificationDomain: text("verificationDomain"),
  adminRole: adminRoleEnum("adminRole"),
  isOfficial: boolean("isOfficial").default(false).notNull(),
  developerTags: text("developerTags").array().default([]).notNull(),
  streakCount: integer("streakCount").default(0).notNull(),
  lastClaimDate: timestamp("lastClaimDate"),
  totalXP: integer("totalXP").default(0).notNull(),
  developerLevel: integer("developerLevel").default(1).notNull(),
  uniqueAppsLaunched: integer("uniqueAppsLaunched").default(0).notNull(),
  tier: text("tier").default("starter").notNull(),
  tierScore: integer("tierScore").default(0).notNull(),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
  updatedAt: timestamp("updatedAt").default(sql`now()`).notNull(),
});

