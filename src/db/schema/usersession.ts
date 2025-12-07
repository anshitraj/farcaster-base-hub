import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const UserSession = pgTable("UserSession", {
  id: uuid("id").primaryKey().defaultRandom(),
  wallet: text("wallet").notNull(),
  sessionToken: text("sessionToken").notNull().unique(),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});

