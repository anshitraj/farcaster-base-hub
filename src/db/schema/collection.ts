import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { Developer } from "./developer";

export const Collection = pgTable("Collection", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").default("custom").notNull(),
  isPublic: boolean("isPublic").default(true).notNull(),
  developerId: uuid("developerId").notNull().references(() => Developer.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
  updatedAt: timestamp("updatedAt").default(sql`now()`).notNull(),
});

