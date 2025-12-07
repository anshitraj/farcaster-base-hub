import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { MiniApp } from "./miniapp";

export const AppLaunchEvent = pgTable("AppLaunchEvent", {
  id: uuid("id").primaryKey().defaultRandom(),
  miniAppId: uuid("miniAppId").notNull().references(() => MiniApp.id, { onDelete: "cascade" }),
  wallet: text("wallet"),
  farcasterId: text("farcasterId"),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
});

