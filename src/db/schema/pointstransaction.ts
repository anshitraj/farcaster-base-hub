import { pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { UserPoints } from "./userpoints";

export const PointsTransaction = pgTable("PointsTransaction", {
  id: uuid("id").primaryKey().defaultRandom(),
  wallet: text("wallet").notNull().references(() => UserPoints.wallet, { onDelete: "cascade" }),
  points: integer("points").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  referenceId: text("referenceId"),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
});

