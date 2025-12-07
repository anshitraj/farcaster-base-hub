import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { MiniApp } from "./miniapp";
import { Developer } from "./developer";

export const BoostRequest = pgTable("BoostRequest", {
  id: uuid("id").primaryKey().defaultRandom(),
  appId: uuid("appId").notNull().references(() => MiniApp.id, { onDelete: "cascade" }),
  developerId: uuid("developerId").notNull().references(() => Developer.id, { onDelete: "cascade" }),
  status: text("status").default("pending").notNull(),
  requestedAt: timestamp("requestedAt").default(sql`now()`).notNull(),
  approvedAt: timestamp("approvedAt"),
  approvedBy: text("approvedBy"),
  expiresAt: timestamp("expiresAt"),
  duration: integer("duration").default(24).notNull(),
  boostType: text("boostType").default("paid").notNull(),
  xpCost: integer("xpCost"),
  txHash: text("txHash"),
});

