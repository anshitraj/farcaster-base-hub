import { pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { Developer } from "./developer";
import { MiniApp } from "./miniapp";

export const Badge = pgTable("Badge", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  imageUrl: text("imageUrl").notNull(),
  appName: text("appName").notNull(),
  appId: uuid("appId").references(() => MiniApp.id, { onDelete: "cascade" }),
  developerId: uuid("developerId").notNull().references(() => Developer.id, { onDelete: "cascade" }),
  badgeType: text("badgeType").notNull().default("sbt"), // "sbt" for owner badges, "cast_your_app" for lister badges
  txHash: text("txHash"),
  claimed: boolean("claimed").default(false).notNull(),
  metadataUri: text("metadataUri"),
  tokenId: text("tokenId"),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
  claimedAt: timestamp("claimedAt"),
});

