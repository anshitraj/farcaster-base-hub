import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const BaseDiscoverPost = pgTable("BaseDiscoverPost", {
  id: uuid("id").primaryKey().defaultRandom(),
  imageUrl: text("imageUrl").notNull(),
  redirectUrl: text("redirectUrl").notNull(),
  createdAt: timestamp("createdAt").default(sql`now()`).notNull(),
});

