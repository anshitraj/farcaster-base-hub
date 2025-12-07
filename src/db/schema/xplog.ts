import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { Developer } from "./developer";

export const XPLog = pgTable("XPLog", {
  id: uuid("id").primaryKey().defaultRandom(),
  developerId: uuid("developerId").notNull().references(() => Developer.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  referenceId: text("referenceId"),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
});

