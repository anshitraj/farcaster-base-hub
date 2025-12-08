import { pgTable, text, boolean, integer, timestamp, uuid, real } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { Developer } from "./developer";

export const MiniApp = pgTable("MiniApp", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  url: text("url").notNull().unique(),
  baseMiniAppUrl: text("baseMiniAppUrl"),
  farcasterUrl: text("farcasterUrl"),
  iconUrl: text("iconUrl").notNull(),
  headerImageUrl: text("headerImageUrl"),
  category: text("category").notNull(),
  verified: boolean("verified").default(false).notNull(),
  status: text("status").default("pending").notNull(),
  reviewMessage: text("reviewMessage"),
  notesToAdmin: text("notesToAdmin"),
  developerId: uuid("developerId").notNull().references(() => Developer.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
  updatedAt: timestamp("updatedAt").default(sql`now()`).notNull(),
  lastUpdatedAt: timestamp("lastUpdatedAt"),
  developerTags: text("developerTags").array().default([]).notNull(),
  contractAddress: text("contractAddress"),
  contractVerified: boolean("contractVerified").default(false).notNull(),
  clicks: integer("clicks").default(0).notNull(),
  installs: integer("installs").default(0).notNull(),
  launchCount: integer("launchCount").default(0).notNull(),
  uniqueUsers: integer("uniqueUsers").default(0).notNull(),
  popularityScore: integer("popularityScore").default(0).notNull(),
  ratingAverage: real("ratingAverage").default(0).notNull(),
  ratingCount: integer("ratingCount").default(0).notNull(),
  farcasterJson: text("farcasterJson"),
  screenshots: text("screenshots").array().default([]).notNull(),
  autoUpdated: boolean("autoUpdated").default(false).notNull(),
  topBaseRank: integer("topBaseRank"),
  featuredInBanner: boolean("featuredInBanner").default(false).notNull(),
  monetizationEnabled: boolean("monetizationEnabled").default(false).notNull(),
  tags: text("tags").array().default([]).notNull(),
  whatsNew: text("whatsNew"), // What's new / changelog section
  // Badge fields
  developerBadgeReady: boolean("developerBadgeReady").default(false).notNull(),
  developerBadgeImage: text("developerBadgeImage"),
  developerBadgeMetadata: text("developerBadgeMetadata"),
  castBadgeMinted: boolean("castBadgeMinted").default(false).notNull(),
  developerBadgeMinted: boolean("developerBadgeMinted").default(false).notNull(),
});

