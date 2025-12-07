import { pgTable, text, integer, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { MiniApp } from "./miniapp";

export const promoStatusEnum = pgEnum("PromoStatus", ["active", "inactive", "expired"]);

export const Promo = pgTable("Promo", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  imageUrl: text("imageUrl").notNull(),
  redirectUrl: text("redirectUrl").notNull(), // URL to redirect to (can be app URL or external)
  appId: uuid("appId").references(() => MiniApp.id, { onDelete: "cascade" }), // Optional: link to specific app
  status: promoStatusEnum("status").default("active").notNull(),
  startDate: timestamp("startDate").default(sql`now()`).notNull(),
  endDate: timestamp("endDate"), // Optional: if null, promo doesn't expire
  clicks: integer("clicks").default(0).notNull(),
  priority: integer("priority").default(0).notNull(), // Higher priority = shown first
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
  updatedAt: timestamp("updatedAt").default(sql`now()`).notNull(),
});

