import { pgTable, text, boolean, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const Advertisement = pgTable("Advertisement", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title"),
  imageUrl: text("imageUrl").notNull(),
  linkUrl: text("linkUrl"),
  position: text("position").default("sidebar").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  order: integer("order").default(0).notNull(),
  clickCount: integer("clickCount").default(0).notNull(),
  viewCount: integer("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
  updatedAt: timestamp("updatedAt").default(sql`now()`).notNull(),
  createdBy: text("createdBy"),
});

