import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { MiniApp } from "./miniapp";

export const AccessCode = pgTable("AccessCode", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  appId: uuid("appId").notNull().references(() => MiniApp.id, { onDelete: "cascade" }),
  ownerId: text("ownerId").notNull(),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
  expiresAt: timestamp("expiresAt"),
  used: boolean("used").default(false).notNull(),
  usedBy: text("usedBy"),
  usedAt: timestamp("usedAt"),
});

