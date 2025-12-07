import { pgTable, text, boolean, real, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { MiniApp } from "./miniapp";

export const PremiumApp = pgTable("PremiumApp", {
  id: uuid("id").primaryKey().defaultRandom(),
  miniAppId: uuid("miniAppId").notNull().unique().references(() => MiniApp.id, { onDelete: "cascade" }),
  featured: boolean("featured").default(false).notNull(),
  onSale: boolean("onSale").default(false).notNull(),
  salePrice: real("salePrice"),
  featuredIn: text("featuredIn").array().default([]).notNull(),
  addedAt: timestamp("addedAt").default(sql`now()`).notNull(),
  addedBy: text("addedBy").notNull(),
});

