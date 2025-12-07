import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { MiniApp } from "./miniapp";

export const AnalyticsEvent = pgTable("AnalyticsEvent", {
  id: uuid("id").primaryKey().defaultRandom(),
  appId: uuid("appId").notNull().references(() => MiniApp.id, { onDelete: "cascade" }),
  wallet: text("wallet"),
  farcasterId: text("farcasterId"),
  eventType: text("eventType").notNull(),
  sessionId: text("sessionId"),
  sessionTime: integer("sessionTime"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
});

