import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { MiniApp } from "./miniapp";

export const AppEvent = pgTable("AppEvent", {
  id: uuid("id").primaryKey().defaultRandom(),
  miniAppId: uuid("miniAppId").notNull().references(() => MiniApp.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
}, (table) => ({
  // Index for fast lookups by miniAppId (used in trending queries)
  miniAppIdIdx: index("appevent_miniappid_idx").on(table.miniAppId),
  // Index for time-based filtering (used in trending score calculation)
  createdAtIdx: index("appevent_createdat_idx").on(table.createdAt),
  // Composite index for common query pattern: miniAppId + createdAt
  miniAppIdCreatedAtIdx: index("appevent_miniappid_createdat_idx").on(table.miniAppId, table.createdAt),
}));

